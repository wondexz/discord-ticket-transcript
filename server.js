const config = require('./config.js');
const fs = require('fs');
const express = require('express');
const chalk = require('chalk');
const port = config.port || 80
const ejs = require('ejs');
const path = require('path');

const app = express()
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, './views'));

app.get('/ticket/:code', (req, res) => {
    const transcriptCode = req.params.code;

    const filePath = path.join(__dirname, './transcripts', `${transcriptCode}.html`);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).render('error', { err: "Ticket bulunamadı", rp: "/" });
        }

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).render('error', { err: "Ticket okunurken bir hata oluştu", rp: "/" });
            }

            res.render('ticket', { transcript: data });
        });
    });
});

app.get('/ticket', (req, res) => {
    const transcriptCode = req.query.code;
    const filePath = path.join(__dirname, './transcripts', `${transcriptCode}`);

    if (!transcriptCode) {
        return res.status(404).render('error', { err: "Ticket bulunamadı", rp: "/" });
    }

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).render('error', { err: "Ticket bulunamadı", rp: "/" });
        }

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).render('error', { err: "Ticket okunurken bir hata oluştu", rp: "/" });
            }

            res.render('ticket', { transcript: data });
    
        });
    });
});

app.listen(port, () => {
    console.log(chalk.cyan(`[API]`) + chalk.green(` Sunucu http://localhost:${port}'da başlatıldı.`));
});