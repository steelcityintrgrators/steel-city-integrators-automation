const {loadBank,seal,createState,prepareNext}=require('../lib/engine');

module.exports=function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'method_not_allowed'})}
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch{body={}}}
  const total=Number(body?.total),testId=typeof body?.testId==='string'?body.testId:'Pilot';
  try{
    const bank=loadBank(),state=createState(total,testId),question=prepareNext(state,bank);
    return res.status(200).json({sessionToken:seal(state),question,progress:{answered:0,total:state.total}});
  }catch(e){
    const known=['invalid_length'];
    return res.status(known.includes(e.message)?400:500).json({error:known.includes(e.message)?e.message:'session_start_failed'});
  }
};
