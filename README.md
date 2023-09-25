## ID-FIX
[Read the french version LISEZ-MOI.md](LISEZ-MOI.md)
## Description
Id-fix API is a service that receives BAL format data, handles it and send it to the BAN plateforme. 
Depending on whether the 'commune' is using the BAN-ID or not, Id-fix will send the data to the legacy API or use the BAN-ID API. In the second case, Id-fix will detect the data to create, to modify and to delete. It will also format it to the correct structure to use BAN-ID API.

## Installation

Choose from a docker or a local installation : 

### Docker

#### Prerequisites
- Docker
- Docker-compose

Instructions on how to install the API :

1. Clone this repository
2. Start the docker container : 

```bash
docker-compose up --build -d
```

### Local 

#### Prerequisites
- Node (v18 or higher)
- NPM

Instructions on how to install the API :

1. Install dependencies 

```bash
npm install
```

2. Start the api : 

```bash
npm run dev
```

## Scripts
I. Init a BAL csv into the BAN plateforme using the ID-Fix BAL processing.

Prerequisite : the district data of the BAL to import needs to be already present in the BAN DB. If not, use the POST /district api to create it.

Here is the command to use : 
```bash
npm run initBALIntoBAN the/path/to/BAL/CSV
```
replace "the/path/to/BAL/CSV" to the actual path of the BAL csv to process and insert into the BAN

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Credits
Express
TypeScript
Docker
Docker Compose
ESLint
Prettier
