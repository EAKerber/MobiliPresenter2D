// CI ONLY. Build a validated, in-memory V5 Buyer payload from checked-in defaults.
// This is not a published configuration and never writes to Netlify Blobs or a database.
import configCore from "../../app/core/configuration.js";
import administrationV5 from "../../app/core/administration-v5.js";
import publishedReader from "../../app/core/published-configuration.js";
import projection from "../../app/core/published-buyer-projection.js";
import flow from "../../app/core/flow-model.js";
import hierarchy from "../../app/data/hierarchy-defaults.js";
import defaults from "../../app/data/configurator-settings.js";
import catalog from "../../app/data/catalog-data.js";
import priceBook from "../../app/data/mock-price-book.js";
import scene from "../../app/data/scene-data.js";
import pricingContract from "../../app/core/pricing-contract.js";
import presentationPolicy from "../../app/data/presentation-policy-defaults.js";

const dependencies={configuration:configCore,administrationV5,catalog,priceBook,scene};

export function createLocalBuyerFixture({administration}={}){
 const v3=configCore.createDefaultAdministration(defaults,catalog,priceBook,scene);
 const v5=administration===undefined
  ? administrationV5.upgrade(v3,configCore,flow,catalog,priceBook,scene,hierarchy)
  : administration;
 const problems=administrationV5.validate(v5,configCore,catalog,priceBook,scene);
 if(problems.length)throw new Error("CI_LOCAL_FIXTURE_INVALID_V5: "+problems.join("; "));

 const inspected=publishedReader.inspectPublishedRaw({kind:"stored",etag:"LOCAL_ONLY",value:v5},dependencies);
 if(inspected.kind!=="valid"||inspected.schema!==administrationV5.SCHEMA){
  throw new Error("CI_LOCAL_FIXTURE_INVALID_V5: published reader rejected the V5 document");
 }
 const payload=projection.project(inspected.value,{
  configuration:configCore,administrationV5,flow,catalog,priceBook,scene,
  hierarchyDefaults:hierarchy,pricingContract,defaultPresentationPolicy:presentationPolicy
 });
 return {administration:inspected.value,payload,sourceSchema:inspected.schema};
}
