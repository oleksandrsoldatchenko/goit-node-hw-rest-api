const app = require('./src/app')

const PORT = process.env.PORT || 8081;

app.listen(PORT, (err) => {
  if (err) console.error("Error at server launch:", err);
  console.log("Server running. Use our API on port:", PORT);
});
