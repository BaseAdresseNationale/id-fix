## ID-FIX

[Read the french version LISEZ-MOI.md](LISEZ-MOI.md)

## Description

Id-fix api is a service that receives bal format data, handles it and send it to the ban-plateforme.
Depending on whether the district is using the ban-id or not, id-fix will send the data to the ban-plateforme legacy api or use the ban-plateforme ban-id api. In the second case, id-fix will detect the data to create, to modify and to delete. It will also format it to the correct structure to use ban-id api.

## Env variables

Copy paste the .env.sample file as a .env file

| Variable Name           | Default Value | Mandatory | Description |
|-------------------------|--------------|-----------|-------------|
| `IDEFIX_ADMIN_TOKENS`  | `""` (empty)  | ✅ Yes    | Comma-separated list of admin authentication tokens. Each token must be exactly **36 characters** long and prefixed with `Token` in API requests. |
| `BAN_API_URL`          | `""` (empty)  | ✅ Yes    | URL of the BAN API. |
| `BAN_API_TOKEN`        | `""` (empty)  | ✅ Yes    | Token for accessing the BAN API. |
| `BAN_LEGACY_API_TOKEN` | `""` (empty)  | ✅ Yes    | Token for accessing the legacy BAN API. |
| `API_DEPOT_URL`        | `""` (empty)  | ✅ Yes    | URL of the API Depot. |
| `STANDALONE_MODE`      | `false`       | ❌ No     | Whether the system runs in standalone mode. |
| `PATH_TO_BAL_FILE`     | `./`          | ❌ No     | Directory path where the BAL file is stored. The file must be named **`bal-${cog}.csv`**, where `${cog}` is the district cog. |

## Installation

Choose from a Docker or a local installation :

### Docker

#### Prerequisites

- Docker
- Docker-compose

Instructions on how to install the api (dev mode) :

1. Clone this repository
2. Start the docker container :

```bash
docker-compose up --build -d
```

### Local

#### Prerequisites

- Node (v18 or higher)
- NPM

Instructions on how to install the api (dev mode) :

1. Install dependencies

```bash
npm install
```

2. Start the api :

```bash
npm run dev
```

## Scripts

I. Init a bal csv into the ban-plateforme using the id-fix bal processing.

Prerequisite : the district data of the bal to import needs to be already present in the ban db. If not, use the POST /district api to create it.

Here is the command to use :

```bash
npm run initBALIntoBAN path/to/BAL-file.csv
```

replace "path/to/BAL-file.csv" to the actual path of the bal csv to process and insert into the ban

## Logs

This project uses the winston logging library for logging. The configuration of the logger is defined in the logger.ts file.

### Log Modes

In development mode (when NODE_ENV is not set to production), the logger outputs the logs to the console.

In production mode (when NODE_ENV is set to production), the logger writes the logs to a file using the winston-daily-rotate-file library. The log files are rotated daily and are stored in the logs directory. The filename of the log files is in the format id-fix-YYYY-MM-DD.log. For more details about the rotation settings (max file size, max number of file, ...), please refer to the logger.ts file.

### Log Format

The logs are formatted in JSON and each log entry includes a timestamp.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

Express
TypeScript
Docker
Docker Compose
ESLint
Prettier
