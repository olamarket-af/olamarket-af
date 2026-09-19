import { FedaPay, Transaction, Webhook } from 'fedapay'

// Configuration centralisée du SDK FedaPay (agrégateur béninois couvrant
// MTN Mobile Money, Moov Money et carte bancaire derrière une seule API).
// Voir https://docs.fedapay.com — vérifié en septembre 2026, à recontrôler
// si le SDK évolue.
FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY!)
FedaPay.setEnvironment((process.env.FEDAPAY_ENVIRONMENT as 'sandbox' | 'live') ?? 'sandbox')

export { FedaPay, Transaction, Webhook }
