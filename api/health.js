const {init,ping,databaseStatus}=require("./_db");

module.exports=async function(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="GET"){
    res.setHeader("Allow","GET");
    return res.status(405).end();
  }
  const status=databaseStatus();
  if(!status.configured){
    return res.status(503).json({
      ok:false,
      database:"not_configured",
      driver:status.driver,
      acceptedEnvKeys:status.acceptedEnvKeys
    });
  }
  try{
    await init();
    const db=await ping();
    return res.status(200).json({
      ok:true,
      database:"connected",
      driver:status.driver,
      source:status.source,
      db
    });
  }catch(e){
    console.error("Health database check failed",e.code||e.message);
    return res.status(503).json({
      ok:false,
      database:"connection_failed",
      driver:status.driver,
      source:status.source,
      code:e.code||"DATABASE_CONNECTION_FAILED"
    });
  }
};
