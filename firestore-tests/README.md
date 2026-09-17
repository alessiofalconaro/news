# Test delle regole Firestore

Le regole in `../firestore.rules` sono l'unica cosa che davvero impedisce a un
estraneo di leggere i dati: la lista degli invitati controllata nel browser è
solo cortesia verso l'utente. Questi test le eseguono contro l'emulatore
ufficiale, senza toccare il progetto vero.

```bash
cd firestore-tests
npm install     # la prima volta scarica anche l'emulatore (serve Java)
npm test
```

Ogni verifica dice cosa deve succedere: chi può leggere cosa, chi non può
scrivere, quali topic vengono rifiutati perché malformati. Se ne tocchi le
regole, rilancia questo comando prima di pubblicarle.
