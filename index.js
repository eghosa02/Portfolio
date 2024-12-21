import { google } from 'googleapis';
import { Octokit } from '@octokit/rest';
import { GraphQLClient, gql } from 'graphql-request';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const spreadsheetId = '1YdCcHmGOKrHJed4brXRxZ2T4DiDjqDqqdRGoSWvhQ54'; // ID del file excel

const prNumber = process.env.GITHUB_REF.split('/')[2];
const repoOwner = process.env.GITHUB_REPOSITORY.split('/')[0];
const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];

// GraphQL client setup
const graphQLClient = new GraphQLClient('https://api.github.com/graphql', {
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
  }
});
//CAMBIARE IN ORGANIZZAZIONE CON ALT+F4
const GET_PROJECT_ID_QUERY = gql`
query {
  user(login: "eghosa02"){   
  projectV2(number: 1) {
    id
    }
  }
}`;

const GET_PROJECTS_QUERY = gql`
query($projectId: ID!){
   node(id: $projectId) {
    ... on ProjectV2 {
      fields(first: 20) {
        nodes {
          ... on ProjectV2Field {
            id
            name
          }
          ... on ProjectV2IterationField {
            id
            name
            configuration {
              iterations {
                startDate
                id
                title
              }
            }
          }
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
        }
      }
    }
  }
}
`;

async function getProjectId() {
    const data = await graphQLClient.request(GET_PROJECT_ID_QUERY);
    console.log(JSON.stringify(data, null, 2));
    return data.projectV2.id; // Restituisci l'ID del progetto
}

(async () => {
    try {
        // Recupera la pull request
        const prResponse = await octokit.pulls.get({
            owner: repoOwner,
            repo: repoName,
            pull_number: prNumber
        });

        const prBody = prResponse.data.body;

        // Estrai ore effettive dalla descrizione della pull request
        const timeSpentMatch = prBody.match(/tempo impiegato:\s*(\d+)/i);
        if (!timeSpentMatch) {
            throw new Error('Tempo impiegato non trovato nella descrizione della pull request.');
        }
        const timeSpent = parseInt(timeSpentMatch[1], 10);

        // Estrai l'ID della issue dalla descrizione della pull request
        const issueMatch = prBody.match(/closes\s+#(\d+)/i);
        if (!issueMatch) {
            throw new Error('ID della issue non trovato nella descrizione della pull request.');
        }
        const issueId = parseInt(issueMatch[1], 10);

        // Recupera la issue
        const issueResponse = await octokit.issues.get({
            owner: repoOwner,
            repo: repoName,
            issue_number: issueId
        });

        const issueBody = issueResponse.data.body;

        // Estrai il ruolo dalla descrizione della issue
        const roleMatch = issueBody.match(/## Ruolo\s+([a-zA-Z\s]+)/i);
        if (!roleMatch) {
            throw new Error('Ruolo non trovato nella descrizione della issue.');
        }
        const role = roleMatch[1].trim();

        // Estrai ore preventivate dalla descrizione della issue
        const idealTimeMatch = issueBody.match(/## Ore preventivate\s+(\d+)/i);
        if (!idealTimeMatch) {
            throw new Error('Ore preventivate non trovate nella descrizione della issue.');
        }
        const idealTime = parseInt(idealTimeMatch[1], 10);

        console.log("Recupero la lista dei progetti...", repoOwner, repoName, prNumber);

        const projectId = await getProjectId();
        const data = await graphQLClient.request(GET_PROJECTS_QUERY, {projectId});
        console.log(JSON.stringify(data, null, 2));

        let sprintName = 'Nessuno sprint';
        const project = data.node.fields.nodes;

        console.log(`Progetto: ${project.title}`);
    
        for (const field of project.fields.nodes) {
            if (field.configuration && field.configuration.iterations) {
                for (const iteration of field.configuration.iterations) {
                    console.log(`Iterazione trovata: ${iteration.title}`);
                    if (iteration.id) {
                        sprintName = iteration.title;
                        break;
                    }
                }
            }
            if (sprintName !== 'Nessuno sprint') break;
        }

        // Recupera il contenuto del foglio
        const sheetResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1'
        });

        const rows = sheetResponse.data.values || [];

        // Cerca una riga con lo stesso ID della issue
        let rowIndexToUpdate = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][1] === `#${issueId}`) {
                rowIndexToUpdate = i;
                break;
            }
        }

        const newRow = [sprintName, `#${issueId}`, role, idealTime, timeSpent];

        if (rowIndexToUpdate !== -1) {
            // Aggiorna la riga esistente
            const range = `Sheet1!A${rowIndexToUpdate + 1}:E${rowIndexToUpdate + 1}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [newRow]
                }
            });

            console.log(`Dati aggiornati nella riga ${rowIndexToUpdate + 1}.`);
        } else {
            // Aggiunge una nuova riga
            const emptyRowIndex = rows.findIndex(row => row.every(cell => cell === ''));
            const targetRowIndex = emptyRowIndex === -1 ? rows.length : emptyRowIndex;

            const range = `Sheet1!A${targetRowIndex + 1}:E${targetRowIndex + 1}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [newRow]
                }
            });

            console.log(`Dati aggiunti nella riga ${targetRowIndex + 1}.`);
        }
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
