# 测试自动化部署

参考文章 [实战笔记：Jenkins打造强大的前端自动化工作流](https://juejin.im/post/5ad1980e6fb9a028c42ea1be)

# Couldn’t find any executable in "/var/jenkins_home/tools/jenkins.plugins.nodejs.tools.NodeJSInstallation/
# 是因为docker中jenkinsci/ocean镜像的问题，更换另一个镜像就有了node环境

```
npm install &&
npm run build &&
cd dist && 
tar -zcvf dist.tar.gz *

```
```
# 先授权目录
sudo chown -R 1000:1000 /docker/jenkins_home/
# 赋予Jenkins最高权限
docker run --name jenkins --privileged=true  -v /docker/jenkins_home:/var/jenkins_home -p 8080:8080 -p 50000:50000 -d jenkins/jenkins
```

# github webhook http://admin:115d932435716d2b272151792f3becfb25@valleylmh.vip:8080/generic-webhook-trigger/invoke