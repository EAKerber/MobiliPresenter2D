// Current V5 access-role contract — pure, offline, no database or Netlify access.
import test from "node:test";
import assert from "node:assert/strict";
import {
 canManageAdministration,canUseConfigurator,canUseInternalPages,
 canIssueOrRevokeGrants,identityRoles
} from "../../netlify/access/identity-policy.mjs";
test("anonymous and malformed sessions cannot authorize private UI",()=>{
 for(const u of [undefined,null,{}, {id:"u"}, {id:"u",roles:["buyer"]}, {roles:["admin"]}]){
   assert.equal(canManageAdministration(u),false);
   assert.equal(canUseInternalPages(u),false);
   assert.equal(canIssueOrRevokeGrants(u),false);
   assert.equal(canUseConfigurator({user:u}),false);
 }
 for(const s of [null,{}, {id:"s"}, {grant_id:"g"}, {id:"s",grant_id:"g"}, {id:"s",expires_at:"time"}])
   assert.equal(canUseConfigurator({temporarySession:s}),false);
});
test("staff cannot write administration while admin can",()=>{
 const staff={id:"staff-id",roles:["staff"]};
 const admin={id:"admin-id",roles:["admin"]};
 assert.equal(canManageAdministration(staff),false);
 assert.equal(canUseInternalPages(staff),true);
 assert.equal(canIssueOrRevokeGrants(staff),true);
 assert.equal(canManageAdministration(admin),true);
 assert.equal(canUseInternalPages(admin),true);
});
test("temporary verified-grant shape authorizes buyer only",()=>{
 const temporarySession={id:"session-id",grant_id:"grant-id",expires_at:"2099-01-01T00:00:00Z"};
 assert.equal(canUseConfigurator({user:null,temporarySession}),true);
 assert.equal(canManageAdministration(null),false);
 assert.equal(canUseInternalPages(null),false);
});
test("roles are gathered from both supported claim sources",()=>{
 const roles=identityRoles({id:"u",roles:["staff"],app_metadata:{roles:["admin",42]}});
 assert.deepEqual([...roles].sort(),["admin","staff"]);
 assert.equal(canManageAdministration({id:"u",app_metadata:{roles:["admin"]}}),true);
});
