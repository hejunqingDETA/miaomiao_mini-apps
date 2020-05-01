const router = require('koa-router')()
const config = require('../config.js')
// 引入koa2对外http请求的类
const request = require('request-promise')
// 引入文件操作类（内置的）
const fs = require('fs')

router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello Koa 2!'
  })
})

router.get('/string', async (ctx, next) => {
  ctx.body = 'koa2 string'
})

router.get('/json', async (ctx, next) => {
  ctx.body = {
    title: 'koa2 json'
  }
})

router.post('/uploadBannerImg',async (ctx,next)=>{

  var files = ctx.request.files;
  var file = files.file;
  // console.log(files)

  try{
    
    //发起get请求，获取access_token
    let options = {
      uri:'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + config.appId + '&secret=' + config.secret,
      json:true
    }

    
    let {access_token} = await request(options)
    // console.log(access_token);
    let fileName = `${Date.now()}.jpg`;   //es6模板字符串写法
    let filePath = `banner/${fileName}`;
    
    //发起post请求，获取上传图片链接的url地址
    options = {
      method:'POST',
      uri:'https://api.weixin.qq.com/tcb/uploadfile?access_token=' + access_token,
      body:{
        "env":"developer-7zzim",    //云数据库ID
        "path":filePath  //图片路径
      },
      json:true
    }

    let res = await request(options);   //发起请求并接受返回参数
    let file_id = res.file_id;  //获取返回的文件ID值

    options = {
      method:'POST',
      uri:'https://api.weixin.qq.com/tcb/databaseadd?access_token=' + access_token,
      body:{
        "env":"developer-7zzim",  //云数据库ID
        "query":"db.collection(\"banner\").add({data:{fileId:\"" + file_id + "\"}})"
      },
      json:true
    }
    
    //将拿到的file_id插入到云数据的banner集合中
    await request(options);


    //再次组装数据，将本地的图片以文件流的形式组装好，通过上传连接把图片上传到云存储中
    options = {
      method:'POST',
      uri:res.url,
      formData:{
        "signature":res.authorization,
        "key":filePath,
        "x-cos-security-token":res.token,
        "x-cos-meta-fileid":res.cos_file_id,
        "file":{
          value:fs.createReadStream(file.path),
          options:{
            filename:fileName,
            contentType:file.type
          }
        }
      }
    }

    await request(options);
    ctx.body = res;

  }catch(error){
    console.log(error.stack);
  }

})

module.exports = router
