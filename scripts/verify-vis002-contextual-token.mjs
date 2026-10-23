// P-TOKEN-02B compatibility entrypoint. Active distribution is version 0.2.
export { verify } from "./verify-vis002-contextual-token-v2.mjs";
import { verify } from "./verify-vis002-contextual-token-v2.mjs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 verify().then(x=>console.log("P_TOKEN_02B_SOURCE_PASS "+JSON.stringify(x)))
  .catch(error=>{console.error(error);process.exitCode=1;});
}
