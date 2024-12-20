import { google } from 'googleapis';
import { Octokit } from '@octokit/rest';

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

        // Recupera il nome dello sprint dall'iterazione
        const projectItemsResponse = await octokit.graphql(`
            query ($repoOwner: String!, $repoName: String!, $issueId: Int!) {
                repository(owner: $repoOwner, name: $repoName) {
                    issue(number: $issueId) {
                        projectItems(first: 10) {
                            nodes {
                                project {
                                    title
                                }
                            }
                        }
                    }
                }
            }
        `, {
            repoOwner,
            repoName,
            issueId
        });

        const projectNodes = projectItemsResponse.repository.issue.projectItems.nodes;
        const sprintName = projectNodes.length > 0 ? projectNodes[0].project.title : 'Nessuno sprint';

        // Recupera il contenuto del foglio
        const sheetResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1'
        });

        const rows = sheetResponse.data.values || [];

        // Trova la prima riga vuota
        const emptyRowIndex = rows.findIndex(row => row.every(cell => cell === ''));
        const targetRowIndex = emptyRowIndex === -1 ? rows.length : emptyRowIndex;

        // Compila i dati nella riga
        const newRow = [sprintName, `#${issueId}`, role, idealTime, timeSpent];

        const range = `Sheet1!A${targetRowIndex + 1}:E${targetRowIndex + 1}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: {
                values: [newRow]
            }
        });

        console.log(`Dati aggiornati con successo nella riga ${targetRowIndex + 1}.`);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
