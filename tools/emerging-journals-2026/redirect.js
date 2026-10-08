const searchParams=new URLSearchParams(location.search);
const q=searchParams.get('q');
const target=new URL('/tools/journal-hub/',location.origin);
if(q){target.searchParams.set('q',q);target.searchParams.set('journal',q)}
location.replace(target.href);
