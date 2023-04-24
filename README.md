## ID-FIX
[Read the french version LISEZ-MOI.md](LISEZ-MOI.md)
## Description
Id-fix API is a service that receives BAL format data, handles it and send it to the BAN plateforme. 
Depending on whether the 'commune' is using the BAN-ID or not, Id-fix will send the data to the legacy API or use the BAN-ID API. In the second case, Id-fix will detect the data to create, to modify and to delete. It will also format it to the correct structure to use BAN-ID API.

## Prerequisites
- Docker
- Docker-compose

## Installation
Instructions on how to install the API :

1. Clone this repository
2. Start the docker container : 

```bash
docker-compose up --build -d
```

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Credits
Express
TypeScript
Docker
Docker Compose
ESLint
Prettier
