import { PostgrestClient } from '@supabase/postgrest-js';
import { ajouterJours } from '@stageradar/shared';
import webpush from 'web-push';
import type { OffreNouvelle } from '../pipeline/collect';
import {
  enHeuresCalmes,
  messageResume,
  messagesNouvelles,
  minutesAvantFin,
  momentLocal,
  NOTIFICATIONS_DEFAUT,
  type Message,
  type ReglagesNotifications,
} from './messages';

// Envoi des notifications « Web Push ». Bibliothèque : https://github.com/web-push-libs/web-push
// (sendNotification(abonnement, texte, { vapidDetails, TTL }) ; une réponse 404 ou 410 du service
// de notification signifie que l'abonnement n'existe plus).

export interface ClesVapid {
  publique: string;
  privee: string;
  /** Contact exigé par le protocole : « mailto:… » ou l'adresse du site. */
  sujet: string;
}

/** Clés lues dans l'environnement, ou `null` si les notifications ne sont pas configurées. */
export function clesVapid(env: NodeJS.ProcessEnv = process.env): ClesVapid | null {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return null;
  return { publique: VAPID_PUBLIC_KEY, privee: VAPID_PRIVATE_KEY, sujet: VAPID_SUBJECT };
}

export function genererClesVapid(): { publique: string; privee: string } {
  const { publicKey, privateKey } = webpush.generateVAPIDKeys();
  return { publique: publicKey, privee: privateKey };
}

interface Abonnement {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface EnAttente {
  id: string;
  payload: Message;
}

/** Durée pendant laquelle le service de notification garde un message pour un appareil éteint. */
const DUREE_DE_VIE_S = 24 * 3600;

export interface Notifieur {
  /** Signale les nouvelles offres d'une collecte (ou les met en attente pendant les heures calmes). */
  nouvelles(offres: OffreNouvelle[], maintenant: Date): Promise<number>;
  /** Envoie ce qui attendait la fin des heures calmes, puis le résumé du jour s'il est l'heure. */
  passage(maintenant: Date): Promise<number>;
  /** Notification d'essai, envoyée tout de suite à tous les appareils. */
  essai(): Promise<number>;
}

export function creerNotifieur(urlRest: string, cleSecrete: string, cles: ClesVapid): Notifieur {
  const db = new PostgrestClient(urlRest, {
    headers: { Authorization: `Bearer ${cleSecrete}`, apikey: cleSecrete },
  });

  async function reglages(): Promise<ReglagesNotifications> {
    const { data, error } = await db
      .from('settings')
      .select('notifications')
      .single<{ notifications: Partial<ReglagesNotifications> | null }>();
    if (error) throw new Error(`Lecture des réglages de notification : ${error.message}`);
    const lus = data.notifications ?? {};
    return {
      seuil_push: lus.seuil_push ?? NOTIFICATIONS_DEFAUT.seuil_push,
      resume_quotidien: { ...NOTIFICATIONS_DEFAUT.resume_quotidien, ...lus.resume_quotidien },
      heures_calmes: { ...NOTIFICATIONS_DEFAUT.heures_calmes, ...lus.heures_calmes },
    };
  }

  /** Envoie un message à chaque appareil abonné ; renvoie le nombre d'appareils joints. */
  async function envoyer(message: Message): Promise<number> {
    const { data, error } = await db
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .overrideTypes<Abonnement[], { merge: false }>();
    if (error) throw new Error(`Lecture des abonnements : ${error.message}`);
    let joints = 0;
    for (const abonnement of data) {
      try {
        await webpush.sendNotification(
          {
            endpoint: abonnement.endpoint,
            keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
          },
          JSON.stringify(message),
          {
            vapidDetails: {
              subject: cles.sujet,
              publicKey: cles.publique,
              privateKey: cles.privee,
            },
            TTL: DUREE_DE_VIE_S,
          },
        );
        joints++;
      } catch (erreur) {
        const statut = (erreur as { statusCode?: number }).statusCode;
        if (statut === 404 || statut === 410) {
          // L'appareil s'est désabonné ou l'application a été désinstallée.
          await db.from('push_subscriptions').delete().eq('id', abonnement.id);
        } else {
          console.error(`Notification non remise (${statut ?? 'réseau'}) :`, abonnement.endpoint);
        }
      }
    }
    return joints;
  }

  return {
    async nouvelles(offres, maintenant) {
      const regles = await reglages();
      const messages = messagesNouvelles(offres, regles.seuil_push);
      if (messages.length === 0) return 0;
      const { heure } = momentLocal(maintenant, regles.resume_quotidien.fuseau);
      if (enHeuresCalmes(heure, regles.heures_calmes)) {
        const apres = new Date(
          maintenant.getTime() + minutesAvantFin(heure, regles.heures_calmes.fin) * 60_000,
        );
        const { error } = await db.from('notification_queue').insert(
          messages.map((message) => ({
            type: 'offre',
            payload: message,
            a_envoyer_apres: apres.toISOString(),
          })),
        );
        if (error) throw new Error(`Mise en attente des notifications : ${error.message}`);
        return 0;
      }
      let joints = 0;
      for (const message of messages) joints += await envoyer(message);
      return joints;
    },

    async passage(maintenant) {
      const regles = await reglages();
      const { jour, heure } = momentLocal(maintenant, regles.resume_quotidien.fuseau);
      if (enHeuresCalmes(heure, regles.heures_calmes)) return 0;
      let joints = 0;

      const attente = await db
        .from('notification_queue')
        .select('id,payload')
        .is('envoyee_le', null)
        .neq('type', 'resume')
        .lte('a_envoyer_apres', maintenant.toISOString())
        .order('created_at')
        .limit(20)
        .overrideTypes<EnAttente[], { merge: false }>();
      if (attente.error) throw new Error(`Lecture de la file : ${attente.error.message}`);
      for (const ligne of attente.data) {
        joints += await envoyer(ligne.payload);
        await db
          .from('notification_queue')
          .update({ envoyee_le: maintenant.toISOString() })
          .eq('id', ligne.id);
      }

      const { actif, heure: heureResume } = regles.resume_quotidien;
      if (!actif || heure < heureResume) return joints;
      // Une ligne « resume » par jour sert de témoin : le résumé ne part qu'une fois.
      const deja = await db
        .from('notification_queue')
        .select('id')
        .eq('type', 'resume')
        .eq('payload->>jour', jour)
        .limit(1);
      if (deja.error) throw new Error(`Lecture du témoin de résumé : ${deja.error.message}`);
      if (deja.data.length > 0) return joints;

      // Minuit du jour, dans le fuseau du résumé : `maintenant` moins l'heure locale écoulée.
      const ecoulees = Number(heure.slice(0, 2)) * 60 + Number(heure.slice(3, 5));
      const minuit = new Date(maintenant.getTime() - ecoulees * 60_000);
      const [offres, candidatures, fiches] = await Promise.all([
        db
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .eq('actif', true)
          .eq('masquee', false)
          .is('exclue_raison', null)
          .gte('created_at', minuit.toISOString()),
        db
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .in('statut', ['postule', 'relance'])
          .lte('prochaine_relance', jour),
        db
          .from('country_sheets')
          .select('nom,echeances')
          .overrideTypes<
            { nom: string; echeances: { libelle: string; date: string }[] }[],
            { merge: false }
          >(),
      ]);
      const limite = ajouterJours(jour, 7);
      const echeances = (fiches.data ?? []).flatMap((fiche) =>
        (fiche.echeances ?? [])
          .filter((echeance) => echeance.date >= jour && echeance.date <= limite)
          .map(
            (echeance) =>
              `${fiche.nom}, ${echeance.libelle} (${echeance.date.slice(8)}/${echeance.date.slice(5, 7)})`,
          ),
      );
      const message = messageResume({
        nouvelles: offres.count ?? 0,
        relances: candidatures.count ?? 0,
        echeances,
      });
      if (message) joints += await envoyer(message);
      await db.from('notification_queue').insert({
        type: 'resume',
        payload: { jour, envoye: message !== null },
        envoyee_le: maintenant.toISOString(),
      });
      return joints;
    },

    essai: () =>
      envoyer({
        titre: 'StageRadar',
        corps: 'Les notifications fonctionnent sur cet appareil.',
        url: '/important',
        etiquette: 'essai',
      }),
  };
}
