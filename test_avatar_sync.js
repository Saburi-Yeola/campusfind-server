const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testUpload() {
    try {
        console.log("Starting Identity Hub test...");
        
        // 1. Login or Signup
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: "owner_final@mmcoe.edu.in",
            password: "Password123"
        }).catch(() => null);

        let token;
        if (loginRes) {
            token = loginRes.data.token;
            console.log("Logged in as existing user.");
        } else {
            const signupRes = await axios.post('http://localhost:5000/api/auth/register', {
                name: "Test User",
                email: "owner_final@mmcoe.edu.in",
                password: "Password123"
            });
            token = signupRes.data.token;
            console.log("Signed up as new user.");
        }

        const authHeader = { Authorization: `Bearer ${token}` };

        // 2. Mock Image (Buffer)
        const form = new FormData();
        // Just send some dummy bytes as a "png"
        form.append('avatar', Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), {
            filename: 'test.png',
            contentType: 'image/png',
        });

        console.log("Uploading test avatar...");
        const uploadRes = await axios.post('http://localhost:5000/api/users/upload-avatar', form, {
            headers: {
                ...authHeader,
                ...form.getHeaders()
            }
        });

        console.log("Upload Result:", uploadRes.data);
        
        if (uploadRes.data.url) {
            console.log("SUCCESS: Image URL received and DB updated.");
            
            // 3. Verify Profile
            const profileRes = await axios.get('http://localhost:5000/api/users/me', { headers: authHeader });
            console.log("Verified Profile Image in DB:", profileRes.data.profile_image);
            
            if (profileRes.data.profile_image === uploadRes.data.url) {
                console.log("CRITICAL PASS: Database persistence confirmed.");
            } else {
                console.log("FAIL: Profile image mismatch.");
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("Test failed:", err.response?.data || err.message);
        process.exit(1);
    }
}

testUpload();
