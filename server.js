const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Server running locally!`);
    console.log(`👉 Access via browser: http://localhost:${PORT}`);
    console.log(`==================================================\n`);
});
