import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tablet, Plus } from "lucide-react"

export default function DevicesAndSensorsDocumentation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Tablet className="mr-2 h-5 w-5" />
          Appareils et capteurs
        </CardTitle>
        <CardDescription>
          Gestion de vos appareils IoT et de leurs capteurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="text-lg font-medium">Ajouter un nouvel appareil</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>1.</strong> Cliquez sur le bouton <span className="bg-muted px-2 py-1 rounded inline-flex items-center text-xs"><Plus className="h-3 w-3 mr-1" /> Ajouter un appareil</span> dans le tableau de bord.</p>
          <p><strong>2.</strong> Remplissez les informations requises:
            <ul className="list-disc pl-5 mt-1">
              <li>Nom de l&apos;appareil (ex: &quot;Capteur salon&quot;)</li>
              <li>Join EUI (fourni avec votre appareil)</li>
              <li>Dev EUI (fourni avec votre appareil)</li>
            </ul>
          </p>
          <p><strong>3.</strong> Confirmez l&apos;ajout pour connecter votre appareil.</p>
        </div>

        <h3 className="text-lg font-medium">Configurer les capteurs</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Pour chaque capteur, vous pouvez définir:
            <ul className="list-disc pl-5 mt-1">
              <li><strong>Seuil d&apos;alerte:</strong> La valeur à partir de laquelle une alerte sera déclenchée.</li>
              <li><strong>Capteur d&apos;alerte:</strong> Définir un capteur comme contrôleur des alertes (généralement un bouton).</li>
            </ul>
          </p>
          <p>Pour modifier le seuil:
            <ul className="list-disc pl-5 mt-1">
              <li>Localisez le capteur dans le tableau de bord</li>
              <li>Modifiez la valeur dans le champ de seuil</li>
              <li>Appuyez sur Entrée ou cliquez en dehors du champ pour sauvegarder</li>
            </ul>
          </p>
        </div>

        <h3 className="text-lg font-medium">Supprimer un appareil ou un capteur</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Supprimer un capteur:</strong> Cliquez sur l&apos;icône de suppression à côté du capteur et confirmez votre choix.</p>
          <p><strong>Supprimer un appareil:</strong> Pour le moment, contactez le support pour supprimer un appareil entier.</p>
          <p className="text-amber-600 font-medium">Attention: La suppression est définitive et toutes les données historiques associées seront perdues.</p>
        </div>

        <h3 className="text-lg font-medium">Connecter vos appareils via The Things Network (TTN)</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Pour relier vos capteurs LoRaWAN à l&apos;application via The Things Network, suivez ces étapes:</p>
          
          <h4 className="font-medium mt-4">1. Configuration du décodeur de payload</h4>
          <p>Dans votre console TTN, accédez à votre application puis à l&apos;onglet &quot;Payload formatters&quot;. Sélectionnez &quot;Uplink&quot; et choisissez &quot;Javascript&quot; comme type de formateur.</p>
          <p>Copiez et adaptez le décodeur suivant en fonction de vos capteurs:</p>
          <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto my-2">
            <pre>{`function decodeUplink(input) {
  // Vérifier que le payload contient au moins 4 octets
  if (input.bytes.length < 4) {
    return {
      errors: ["Payload incomplet: doit avoir au moins 4 octets"]
    };
  }

  // Les IDs sont fixes et connus pour vos capteurs
  const data = {
    "IBBTZ1QM": (input.bytes[0] << 8) + input.bytes[1],  // Son (2 octets pour la valeur en dB)
    "36L8JKFN": (input.bytes[2] << 8) + input.bytes[3],  // Vibration (2 octets)
    "H3Z9WH2T": (input.bytes[4] << 8) + input.bytes[5],  // Bouton (2 octets)
    "maintenance": (input.bytes[6] << 8) + input.bytes[7],
  };

  return {
    data: data,
    warnings: [],
    errors: []
  };
}

function encodeDownlink(input) {
  return {
    bytes: [],
    warnings: [],
    errors: []
  };
}`}</pre>
          </div>
          
          <p className="mt-2"><strong>Important:</strong> Les identifiants des capteurs (&quot;IBBTZ1QM&quot;, &quot;36L8JKFN&quot;, etc.) doivent correspondre aux identifiants réels de vos capteurs dans l&apos;application. Vérifiez ces codes dans votre tableau de bord ou auprès du support technique.</p>
          
          <h4 className="font-medium mt-4">2. Configuration du webhook</h4>
          <p>Pour transmettre les données de TTN vers notre application:</p>
          <ol className="list-decimal pl-5 mt-1 space-y-2">
            <li>Dans votre console TTN, accédez à votre application puis à l&apos;onglet &quot;Integrations&quot;</li>
            <li>Cliquez sur &quot;Webhooks&quot; puis &quot;+ Add webhook&quot;</li>
            <li>Sélectionnez &quot;Custom webhook&quot;</li>
            <li>Remplissez les informations suivantes:
              <ul className="list-disc pl-5 mt-1">
                <li><strong>Webhook ID:</strong> api-nest-js (ou un autre nom de votre choix)</li>
                <li><strong>Webhook format:</strong> JSON</li>
                <li><strong>Base URL:</strong> https://dash.web-gine.fr/api (ou l&apos;URL fournie par votre administrateur)</li>
                <li><strong>Downlink API key:</strong> Laissez vide, la clé sera fournie automatiquement dans l&apos;en-tête</li>
              </ul>
            </li>
            <li>Dans la section &quot;Messages&quot;, activez uniquement &quot;Uplink message&quot;</li>
            <li>Cliquez sur &quot;Create webhook&quot; pour finaliser la configuration</li>
          </ol>
          
          <h4 className="font-medium mt-4">3. Configuration du chemin d&apos;uplink</h4>
          <p>Une étape cruciale est la configuration du chemin d&apos;uplink:</p>
          <ol className="list-decimal pl-5 mt-1 space-y-2">
            <li>Dans la section &quot;Enabled event types&quot; de votre webhook</li>
            <li>Assurez-vous que &quot;Uplink message&quot; est coché</li>
            <li>Dans le champ de texte à droite, entrez <strong>/ttn-webhook</strong></li>
            <li>Ce chemin sera ajouté à l&apos;URL de base lors de l&apos;envoi des données (https://dash.web-gine.fr/api/ttn-webhook)</li>
          </ol>
          
          <h4 className="font-medium mt-4">4. Vérification de la connexion</h4>
          <p>Après avoir configuré le décodeur et le webhook:</p>
          <ol className="list-decimal pl-5 mt-1">
            <li>Assurez-vous que votre appareil est correctement enregistré dans TTN</li>
            <li>Vérifiez que l&apos;appareil transmet des données (visible dans l&apos;onglet &quot;Live data&quot; de TTN)</li>
            <li>Consultez votre tableau de bord dans notre application pour confirmer que les données apparaissent correctement</li>
          </ol>
          
          <p className="text-amber-600 font-medium mt-2">Note: Si vous rencontrez des problèmes de connexion, vérifiez que les identifiants des capteurs correspondent exactement entre votre décodeur TTN et notre application.</p>
        </div>
      </CardContent>
    </Card>
  )
}
