const fs = require('fs');
async function getKeys() {
    const res = await fetch('https://api.supabase.com/v1/projects/namkbfftbpecpuqmemjm/api-keys', {
        headers: {
            'Authorization': 'Bearer sbp_ade0812df27821c45357a2a4a6f00184ab32c25e'
        }
    });
    const data = await res.json();
    fs.writeFileSync('temp_keys.json', JSON.stringify(data, null, 2));
}
getKeys().catch(console.error);
