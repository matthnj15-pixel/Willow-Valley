// Resolve all development entry points to the published World Builder,
// including root Pages URLs opened with ?preview=1 and local browser UAT.
export function worldBuilderUrl(scriptUrl){
 const base=new URL("./",scriptUrl);
 const isGithubPages=base.hostname.endsWith(".github.io");
 const isDeployedDev=/\/dev\/$/.test(base.pathname);
 if(isGithubPages&&!isDeployedDev)return new URL("dev/ui-kit/world-lab.html",base).href;
 return new URL("ui-kit/world-lab.html",base).href;
}
