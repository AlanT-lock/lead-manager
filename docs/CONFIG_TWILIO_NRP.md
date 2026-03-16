# Configuration Twilio pour le NRP (appels sortants)

Le flux NRP utilise **uniquement Twilio** (plus Vapi) pour lancer 2 appels, détecter humain vs messagerie (AMD), et transférer vers le télépro.

## 1. Variables d'environnement (Supabase Edge Functions)

À définir dans **Supabase → Project Settings → Edge Functions → Secrets** (ou `.env` local pour `supabase functions serve`) :

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Compte Twilio (Console Twilio → Account) |
| `TWILIO_AUTH_TOKEN` | Token d’auth Twilio |
| `TWILIO_WEBHOOK_BASE_URL` | (Optionnel) URL de base du webhook. Par défaut : `https://<PROJECT_REF>.supabase.co/functions/v1/twilio-nrp-webhook` |

Sans `TWILIO_WEBHOOK_BASE_URL`, l’URL utilisée est celle du projet Supabase. En local, utilise une URL publique (ex: ngrok) pointant vers ta fonction.

**Numéro Twilio** : ce n’est plus un secret. Chaque télépro a **son propre numéro** en base : **profiles.twilio_phone_number** (E.164). Les appels NRP utilisent ce numéro comme émetteur (From).

## 2. Numéro Twilio pour les appels sortants (NRP)

- Le numéro qui **appelle les leads** est celui du télépro : **profiles.twilio_phone_number** (en BDD).
- Chaque télépro doit avoir un numéro Twilio renseigné (acheté/configuré sur le compte Twilio, Voice capable).
- Aucune configuration “Voice URL” n’est nécessaire sur le numéro pour le NRP : les appels sont créés via l’API avec `Url` et `StatusCallback` dans la requête.

## 3. Webhook (URL à donner à Twilio si besoin)

L’Edge Function **twilio-nrp-webhook** doit être accessible en HTTPS. Son URL est :

```
https://<PROJECT_REF>.supabase.co/functions/v1/twilio-nrp-webhook
```

Tu n’as **pas** besoin de la renseigner dans la console Twilio pour le NRP : elle est utilisée directement dans l’API (`Url` et `StatusCallback`) quand on crée les appels.

## 4. Appels entrants : redirection vers le télépro

Le webhook redirige tout appel entrant sur le numéro Twilio du télépro vers son numéro (profiles.phone). L'appelant entend d'abord le message d'attente (vapi_hold_message), puis le télépro est sonné. Pour activer la redirection :

1. Dans **Twilio Console → Phone Numbers → Manage → Active Numbers**, clique sur le numéro.
2. Section **Voice Configuration** :
   - **A CALL COMES IN** : Webhook, HTTP POST
   - **URL** : `https://<PROJECT_REF>.supabase.co/functions/v1/twilio-nrp-webhook`
   - (Pas de paramètre `action` : le webhook détecte l’entrant via `To` / `From`.)
3. En base, renseigne pour chaque télépro le numéro Twilio qui le concerne :  
   **profiles.twilio_phone_number** = numéro E.164 (ex: `+33612345678`).  
   Quand quelqu’un appelle ce numéro, le webhook fait sonner le télépro (fiche `profiles.phone`).

## 5. Voix (message d’attente)

Les messages lus au téléphone (NRP, appels entrants, erreur) utilisent une voix **Amazon Polly** en **fr-FR**. Par défaut : **Polly.Mathieu**. Tu peux changer la voix de deux façons :
- **Secret** `TWILIO_SAY_VOICE` (ex. `Polly.Celine`) : valeur par défaut pour tout le monde.
- **Par télépro** : **profiles.twilio_say_voice** (configurable dans Admin → Utilisateurs → télépro → Voix des messages Twilio). Valeurs possibles : `Polly.Mathieu` (homme), `Polly.Celine` (femme). Vide = utilisation du secret ou Mathieu.

## 6. Profil télépro (base de données)

- **profiles.phone** : numéro du télépro (où le transférer quand un lead humain décroche). Obligatoire pour les télépros.
- **profiles.twilio_phone_number** : numéro Twilio **E.164** du télépro (ex: `+33612345678`). **Obligatoire pour lancer les appels NRP** : c’est ce numéro qui apparaît comme émetteur lors des appels aux leads. Utilisé aussi pour les **appels entrants** : si quelqu’un appelle ce numéro, le webhook transfère vers `profiles.phone`.
- **profiles.twilio_say_voice** : (optionnel) voix Twilio pour les messages (ex. `Polly.Mathieu`, `Polly.Celine`). Si vide, utilisation de `TWILIO_SAY_VOICE` ou `Polly.Mathieu`.

## 7. Déploiement

```bash
supabase functions deploy twilio-nrp-webhook
supabase functions deploy nrp-calls-start
```

Puis appliquer la migration si pas déjà fait :

```bash
supabase db push
# ou
supabase migration up
```

## 8. Ancien webhook Vapi

Si tu avais une route ou une URL qui pointait vers **vapi-webhook** (ex. `src/app/api/webhooks/vapi/route.ts`), tu peux la supprimer ou la laisser : elle n’est plus utilisée par le NRP. Les appels NRP passent entièrement par Twilio et **twilio-nrp-webhook**.

## 9. Résumé du flux NRP (Twilio)

1. Le télépro clique sur « Lancer les appels NRP » → **nrp-calls-start** crée 2 appels Twilio avec **AMD asynchrone** (`AsyncAmd=true`, `Url` = hold, `AsyncAmdStatusCallback` = status).
2. **Dès qu’un lead décroche**, Twilio appelle l’**Url** (hold) → le webhook renvoie un TwiML **Say** (message d’attente) + boucle → le lead entend la voix.
3. En parallèle, l’AMD tourne. Quand elle est terminée, Twilio appelle **AsyncAmdStatusCallback** avec **AnsweredBy** (humain / machine).
4. **twilio-nrp-webhook** (action=status) :
   - Si **humain** : met à jour `telepro_pending_lead_opens`, raccroche l’autre appel, renvoie un TwiML qui fait **Dial** vers le télépro.
   - Si **messagerie** : raccroche, log, et si les 2 sont terminés sans transfert → rappel + `telepro_pending_lead_opens.lead_id = null`.
4. Le front fait un GET sur **api/telepro/pending-lead** et ouvre la fiche du lead si un transfert a eu lieu.

## 10. Dépannage : le télépro ne reçoit pas l’appel

- **Logs** : Dans **Supabase Dashboard → Edge Functions → twilio-nrp-webhook → Logs**, tu dois voir des lignes `[twilio-nrp-webhook]` à chaque requête (action, CallSid, AnsweredBy, etc.). Si tu ne vois que « booted » / « shutdown », Twilio n’atteint pas le webhook ou l’URL est incorrecte.
- **URL du webhook** : En production, définis **TWILIO_WEBHOOK_BASE_URL** explicitement sur l’URL publique de la fonction, ex. `https://<PROJECT_REF>.supabase.co/functions/v1/twilio-nrp-webhook`. C’est cette même URL qui est utilisée pour le `Redirect` vers `action=transfer` ; si l’origine de la requête (proxy, tunnel) diffère, le redirect peut échouer.
- **Twilio envoie AnsweredBy sur l’URL du call** (pas sur le StatusCallback) : quand un lead décroche, Twilio rappelle ton webhook avec `action=hold` et `AnsweredBy=human`. Tu devrais voir dans les logs : d’abord une requête `action=hold` sans AnsweredBy (message d’attente), puis une seconde requête `action=hold` avec `AnsweredBy=human`, puis une requête `action=transfer` (Dial vers le télépro).
- **Console Twilio** : Dans **Twilio Console → Monitor → Logs → Calls**, ouvre un appel NRP et vérifie les requêtes HTTP vers ton domaine (succès 200, ou erreur / timeout).
- **Numéro télépro** : Vérifie que **profiles.phone** du télépro est renseigné et en format E.164 (ex. `+33612345678`).

## 11. Appels entrants : « numéro non attribué » (SFR ou autre)

Si en appelant le numéro Twilio tu entends un message du type « le numéro n’est pas attribué » (SFR ou opérateur), l’appel n’est **pas** géré par Twilio. À vérifier :

1. **Le numéro est bien un numéro Twilio**  
   Dans **Twilio Console → Phone Numbers → Manage → Active Numbers**, le numéro doit apparaître. S’il n’y est pas, achète/configure le numéro dans Twilio.

2. **Configuration Voice obligatoire**  
   Clique sur le numéro → section **Voice** :
   - **Configure with** : Webhooks
   - **A CALL COMES IN** : Webhook
   - **HTTP** : POST
   - **URL** : `https://<PROJECT_REF>.supabase.co/functions/v1/twilio-nrp-webhook`  
   Enregistre (Save). Sans cette URL, Twilio ne sait pas quoi faire et l’appel peut échouer côté opérateur.

3. **En base**  
   **profiles.twilio_phone_number** du télépro = ce numéro en E.164 (ex. `+33612345678`), identique à celui affiché dans Twilio.

4. **Vérifier que le webhook est appelé**  
   Après un appel test, regarde les logs **twilio-nrp-webhook** : tu dois voir une ligne `Inbound: To=+33...`. Si tu ne vois aucune requête quand tu appelles, le problème vient de la config Twilio (étape 2).
