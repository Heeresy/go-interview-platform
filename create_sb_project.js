async function create() {
    const res = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer sbp_ade0812df27821c45357a2a4a6f00184ab32c25e',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'GOPrep',
            organization_id: 'cawslzlkmmbqlrstnxxj',
            db_pass: 'GOPrep@2026!Secure',
            region: 'eu-central-1',
            plan: 'free'
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
create().catch(console.error);
