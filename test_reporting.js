const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  try {
    console.log("🔐 1. Authenticating to obtain JWT token...");
    let token = '';
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'owner9000@mmcoe.edu.in',
            password: 'pass'
        });
        token = loginRes.data.token;
        console.log("✅ Authenticated successfully.");
    } catch (e) {
        console.log("User might not exist, creating one...");
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Test Tester',
            email: 'owner9000@mmcoe.edu.in',
            password: 'pass',
            role: 'student'
        });
        token = registerRes.data.token;
        console.log("✅ Registered and authenticated successfully.");
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };
    const multiparts = { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } };

    console.log("\n🧪 TEST 2: Submit with missing required title field (Expect 400 Bad Request)");
    try {
        const form = new FormData();
        form.append('description', 'Missing my wallet');
        form.append('category', 'Electronics');
        form.append('location_lost', 'Library');
        form.append('date_lost', '2023-11-10');
        await axios.post(`${API_URL}/items/lost`, form, { headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` } });
        console.log("❌ FAILED: Unexpectedly succeeded instead of 400");
    } catch (err) {
        if (err.response?.status === 400) {
            console.log("✅ SUCCESS: Properly rejected with 400.");
            console.log("   Message:", err.response.data.message);
        } else {
            console.log("❌ FAILED: Wrong error code:", err.response?.status);
        }
    }

    console.log("\n🧪 TEST 3: Submit valid lost item WITHOUT image or reward (Expect 201 Created)");
    try {
        const form = new FormData();
        form.append('title', 'Blue Backpack Tracker');
        form.append('category', 'Other');
        form.append('location_lost', 'Library');
        form.append('date_lost', '2023-11-10');
        
        const res = await axios.post(`${API_URL}/items/lost`, form, { headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` } });
        console.log("✅ SUCCESS: Successfully submitted without image!");
        console.log("   Response Data:", res.data);
    } catch (err) {
        console.log("❌ FAILED to submit:", err.response?.data || err.message);
    }

    console.log("\n🧪 TEST 4: Submit valid found item WITH reward configuration (Expect 201 Created)");
    try {
        const form = new FormData();
        form.append('title', 'Designer Wallet Found');
        form.append('category', 'Personal');
        form.append('location_found', 'Canteen');
        form.append('date_found', '2023-11-11');
        form.append('hidden_description', 'Has a red clip inside');
        
        const res = await axios.post(`${API_URL}/items/found`, form, { headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` } });
        console.log("✅ SUCCESS: Found Item correctly ingested!");
        console.log("   Response Data:", res.data);
    } catch (err) {
        console.log("❌ FAILED to submit:", err.response?.data || err.message);
    }
  } catch(fatal) {
      console.log("FATAL ERROR:", fatal?.response?.data || fatal.message);
  }
}

runTests();
