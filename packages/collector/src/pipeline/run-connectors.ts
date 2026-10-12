import type { Connector, ConnectorParams, Offer } from '@stageradar/shared';

export interface ConnectorResult {
  source: string;
  debut: Date;
  fin: Date;
  statut: 'ok' | 'partiel' | 'erreur';
  offers: Offer[];
  /** Erreurs rencontrées : échec de la source entière ou offres impossibles à normaliser. */
  erreurs: string[];
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runOne(connector: Connector, params: ConnectorParams): Promise<ConnectorResult> {
  const debut = new Date();
  const offers: Offer[] = [];
  const erreurs: string[] = [];

  let raws: Awaited<ReturnType<Connector['fetch']>>;
  try {
    raws = await connector.fetch(params);
  } catch (error) {
    return {
      source: connector.id,
      debut,
      fin: new Date(),
      statut: 'erreur',
      offers,
      erreurs: [message(error)],
    };
  }

  for (const raw of raws) {
    try {
      offers.push(connector.normalize(raw));
    } catch (error) {
      erreurs.push(`normalisation : ${message(error)}`);
    }
  }

  return {
    source: connector.id,
    debut,
    fin: new Date(),
    statut: erreurs.length === 0 ? 'ok' : 'partiel',
    offers,
    erreurs,
  };
}

/**
 * Exécute tous les connecteurs. Un connecteur qui échoue n'interrompt pas les autres (§5.4) :
 * son erreur est consignée dans son résultat, destiné à `sources_status`.
 */
export async function runConnectors(
  connectors: Connector[],
  params: ConnectorParams = {},
): Promise<ConnectorResult[]> {
  return Promise.all(connectors.map((connector) => runOne(connector, params)));
}
