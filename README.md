# Start Up Guide
1. Ensure that the docker.env file exists in the folder
2. Run ```docker compose up```
3. After all services are up, run ```bash ./kong/setup.sh ``` to setup kong.

# Troubleshooting

## WebUI does not build properly
replace the webui dockerfile with the dockerfile that utilizes npm install
https://content.nuxt.com/docs/deploy/docker 

# Why are there so little steps?
we use drizzle ORM along with docker scripts to automate creation and modification of database schemas, so that end users will not be required to have a long setup process.