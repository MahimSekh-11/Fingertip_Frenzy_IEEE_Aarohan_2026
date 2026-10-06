import "dotenv/config";
import { app } from "./app.js";
app.listen(process.env.PORT || 5000, () =>
  console.log("Aarohan API listening on port " + (process.env.PORT || 5000)),
);
