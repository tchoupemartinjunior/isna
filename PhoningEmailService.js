
const PhoningEmailService = (function () {
    const STATUS_A_CONTACTER = 'A contacter';
    const EMAIL_SUBJECT = 'Dispatching phoning - ICC Le Mans';
    const FORM_LINK = 'https://forms.gle/Jeo1jqxe8DZw4BkT8';

    /**
     * Envoie le dispatching par email à chaque staff
     * @param {Object} config - Configuration avec ONGLETS, COLONNES
     * @param {SheetRepository} repository - Repository pour accès aux données
     * @param {Object} [options]
     * @param {Set<number>} [options.rowIndexes] - ne traiter que ces lignes (n° de ligne Sheets)
     * @returns {{envoyes:number, sansEmail:string[]}}
     */
    function sendDispatchingEmails(config, repository, options = {}) {
        if (!config || !repository) {
            throw new Error('Configuration and repository are required');
        }

        try {
            const data = repository.getData(config.ONGLETS.PHONING, 1, config.NUM_COLS);

            const result = { envoyes: 0, sansEmail: [] };
            if (data.length === 0) return result;

            // Filtrer et regrouper les données par staff
            const dispatching = groupDataByStaff(data, config.COLONNES, options.rowIndexes);
            if (Object.keys(dispatching).length === 0) return result;

            const staffMap = StaffService.construireStaffMap();

            for (const staffNom in dispatching) {
                if (sendEmailToStaff(staffNom, dispatching[staffNom], staffMap)) {
                    result.envoyes++;
                } else {
                    result.sansEmail.push(`${staffNom} (${dispatching[staffNom].length} visiteur(s))`);
                }
            }

            Logger.log(`Dispatching sent to ${result.envoyes} staff members`);
            return result;
        } catch (error) {
            Logger.log(`Error sending dispatching emails: ${error.message}`);
            throw error;
        }
    }

    /**
     * Regroupe les données par staff
     * @private
     */
    function groupDataByStaff(data, colonnes, rowIndexes) {
        const dispatching = {};
        const staffPhoneMap = StaffService.construireStaffPhoneMap();

        for (let i = 0; i < data.length; i++) {
            if (rowIndexes && !rowIndexes.has(i + 2)) continue;
            const row = data[i];
            const statut = row[colonnes.STATUT_PHONING - 1];
            const personne = row[colonnes.PERSONNE_A_CONTACTER - 1];

            if (!StringNormalizer.areEqual(statut, STATUS_A_CONTACTER) || !personne) {
                continue;
            }

            const staffNom = StringNormalizer.normalizeName(row[colonnes.STAFF_PHONING - 1]);
            const telephone = row[colonnes.TELEPHONE - 1];

            if (!dispatching[staffNom]) {
                dispatching[staffNom] = [];
            }

            // Construit le message et le lien WhatsApp
            const message = decodeURIComponent(MessageService.construireMessage(row));
            const whatsappLink = buildWhatsAppLink(telephone);

            const invitationUrl = row[colonnes.FAMILLE - 1]
                ? InvitationService.buildInvitationUrl(row, staffPhoneMap)
                : null;

            dispatching[staffNom].push({
                personne,
                message,
                whatsappLink,
                invitationUrl,
                famille: row[colonnes.FAMILLE - 1]
            });
        }

        return dispatching;
    }

    /**
     * Envoie l'email à un staff spécifique
     * @private
     */
    function sendEmailToStaff(staffNom, entries, staffMap) {
        const staffInfo = staffMap[staffNom];

        if (!staffInfo || !staffInfo.email) {
            Logger.log(`No email found for staff "${staffNom}"`);
            return false;
        }

        try {
            const emailBody = buildEmailBody(staffNom, entries);

            MailApp.sendEmail({
                to: staffInfo.email,
                subject: EMAIL_SUBJECT,
                htmlBody: emailBody
            });

            Logger.log(`Dispatching email sent to ${staffNom} (${staffInfo.email})`);
            return true;
        } catch (error) {
            Logger.log(`Error sending email to ${staffNom}: ${error.message}`);
            return false;
        }
    }

    /**
     * Construit le corps du mail HTML
     * @private
     */
    function buildEmailBody(staffNom, entries) {
        let body = `Bonjour ${staffNom},<br><br>`;
        body += `Voici la liste des personnes à contacter :<br><br>`;

        entries.forEach((entry, index) => {
            body += `<b>${index + 1}. ${entry.personne}</b><br>`;

            if (entry.invitationUrl) {
                body += `<a href="${entry.invitationUrl}" target="_blank" ` +
                    `style="display:inline-block;margin:6px 0;padding:8px 14px;background:#25D366;color:#fff;` +
                    `border-radius:6px;text-decoration:none;font-weight:bold">` +
                    `Envoyer l'invitation FI ${entry.famille} sur WhatsApp</a><br>`;
            }
            if (entry.whatsappLink) {
                body += `${entry.whatsappLink}<br>`;
            }

            // Formate le message: bold et newlines
            const formattedMessage = entry.message
                .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            body += `${formattedMessage}<br><br>`;
        });

        body += `<p>Merci pour ton engagement 🙏<br>`;
        body += `Merci de remplir le formulaire après l'appel : `;
        body += `<a href="${FORM_LINK}">Lien du formulaire</a><br><br>`;
        body += `Cordialement,<br>Équipe Intégration – ICC Le Mans</p>`;

        return body;
    }

    /**
     * Construit un lien WhatsApp cliquable
     * @private
     */
    function buildWhatsAppLink(telephone) {
        if (!telephone) {
            return '';
        }

        const normalizedPhone = PhoneUtils.toWhatsApp(telephone);
        return `<a href="https://wa.me/${normalizedPhone}" target="_blank">Contacter la personne sur WhatsApp</a>`;
    }

    return {
        sendDispatchingEmails,
        EMAIL_SUBJECT,
        FORM_LINK
    };
})();
