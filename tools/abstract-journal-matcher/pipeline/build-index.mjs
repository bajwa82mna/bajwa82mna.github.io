import fs from "node:fs";
const file=new URL("../data/journal-profiles.min.json",import.meta.url), rows=JSON.parse(fs.readFileSync(file));rows.sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));process.stdout.write(JSON.stringify(rows));
