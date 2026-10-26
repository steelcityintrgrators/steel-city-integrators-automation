const {loadBank,seal,open,prepareNext,applyAnswer,buildReport}=require('../lib/engine');

module.exports=function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'method_not_allowed'})}
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch{body={}}}
  try{
    const bank=loadBank(),state=open(body?.sessionToken);
    applyAnswer(state,body?.selected,bank);
    if(state.answered>=state.total){
      return res.status(200).json({done:true,report:buildReport(state)});
    }
    const question=prepareNext(state,bank);
    return res.status(200).json({done:false,sessionToken:seal(state),question,progress:{answered:state.answered,total:state.total}});
  }catch(e){
    const bad=['invalid_token','expired_token','invalid_answer','no_current_item','unknown_item'];
    return res.status(bad.includes(e.message)?400:500).json({error:bad.includes(e.message)?e.message:'scoring_failed'});
  }
};
