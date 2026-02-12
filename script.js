// ==========================================
// 1. CONFIGURATION ET VARIABLES
// ==========================================
const API_KEY = "ab2e613eae5878d408fb951e1f1e1439";
const BASE_URL = "https://v3.football.api-sports.io";

// ==========================================
// 2. GESTION DES DATES ET CHARGEMENT
// ==========================================
async function changerDate(decalage) {
    const dateCible = new Date();
    dateCible.setDate(dateCible.getDate() + decalage);
    const dateString = dateCible.toISOString().split('T')[0];
    
    // Visuel des boutons : on retire 'active' partout et on l'ajoute au clic
    const boutons = document.querySelectorAll('.date-btn');
    boutons.forEach(b => b.classList.remove('active'));
    
    chargerMatchs(dateString);
}

async function chargerMatchs(dateChoisie) {
    const tableBody = document.getElementById('liste-matchs');
    tableBody.innerHTML = "<tr><td colspan='5'>⏳ Chargement des matchs...</td></tr>";

    try {
        const reponse = await fetch(`${BASE_URL}/fixtures?date=${dateChoisie}`, {
            "method": "GET",
            "headers": {
                "x-rapidapi-host": "v3.football.api-sports.io",
                "x-rapidapi-key": API_KEY
            }
        });
        const donnees = await reponse.json();
        const matchs = donnees.response;

        tableBody.innerHTML = "";

        if (!matchs || matchs.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='5'>Aucun match trouvé pour cette date.</td></tr>";
            return;
        }

        matchs.slice(0, 30).forEach(match => {
            const ligne = document.createElement('tr');
            const matchId = match.fixture.id;
            const matchNom = `${match.teams.home.name} vs ${match.teams.away.name}`;

            let statutText = "À venir";
            if (match.fixture.status.short === "FT") {
                const totalButs = match.goals.home + match.goals.away;
                statutText = (totalButs > 1.5) ? "<span class='win'>✅</span>" : "<span class='loss'>❌</span>";
            }

            ligne.innerHTML = `
                <td>${match.league.name}</td>
                <td>
                    ${matchNom} <br> 
                    <small style="cursor:pointer; color:#4caf50" onclick="ajouterAuCoupon('${matchNom}', 'Perso')">[+ Ajouter manuel]</small>
                </td>
                <td id="stat-${matchId}">
                    <button class="btn-analyser" onclick="analyserStat(${matchId}, ${match.teams.home.id}, ${match.teams.away.id}, '${matchNom}')">📊 Analyser</button>
                </td>
                <td>1.25*</td>
                <td>${statutText}</td>
            `;
            tableBody.appendChild(ligne);
        });
    } catch (e) {
        tableBody.innerHTML = "<tr><td colspan='5'>⚠️ Erreur de connexion API</td></tr>";
    }
}

// ==========================================
// 3. ANALYSE DES STATISTIQUES (+1.5 BUTS)
// ==========================================
async function analyserStat(matchId, homeId, awayId, matchNom) {
    const cell = document.getElementById(`stat-${matchId}`);
    cell.innerHTML = "⏳...";

    try {
        const resp = await fetch(`${BASE_URL}/fixtures?team=${homeId}&last=10`, {
            "headers": { "x-rapidapi-key": API_KEY, "x-rapidapi-host": "v3.football.api-sports.io" }
        });
        const data = await resp.json();
        const derniersMatchs = data.response;

        if (!derniersMatchs || derniersMatchs.length === 0) {
            cell.innerHTML = "<span style='color:gray; font-size:10px;'>Pas de stats</span>";
            return;
        }

        let plus15 = 0;
        let matchsValides = 0;
        derniersMatchs.forEach(m => {
            if (m.goals.home !== null) {
                matchsValides++;
                if ((m.goals.home + m.goals.away) > 1.5) plus15++;
            }
        });

        if (matchsValides > 0) {
            const pourcent = Math.round((plus15 / matchsValides) * 100);
            let couleur = pourcent >= 80 ? '#4caf50' : (pourcent < 50 ? '#f44336' : '#ff9800');
            cell.innerHTML = `<b style="color:${couleur}; cursor:pointer;" onclick="ajouterAuCoupon('${matchNom}', ${pourcent})">${pourcent}% ➕</b>`;
        } else {
            cell.innerHTML = "N/A";
        }
    } catch (err) {
        cell.innerHTML = "❌";
    }
}

// ==========================================
// 4. GESTION DU COUPON ET SAUVEGARDE (LocalStorage)
// ==========================================

// Fonction pour ajouter un match et sauvegarder
function ajouterAuCoupon(nom, proba) {
    let couponSauvegarde = JSON.parse(localStorage.getItem('monCouponFoot')) || [];
    
    // On évite les doublons (ne pas ajouter deux fois le même match)
    if (couponSauvegarde.some(m => m.nom === nom)) {
        alert("Ce match est déjà dans ton coupon !");
        return;
    }

    const nouveauMatch = { nom: nom, proba: proba };
    couponSauvegarde.push(nouveauMatch);
    
    // Sauvegarde sur "l'étagère" du navigateur
    localStorage.setItem('monCouponFoot', JSON.stringify(couponSauvegarde));
    
    // Mise à jour de l'affichage
    afficherLeCoupon();
}

// Fonction pour supprimer un match et mettre à jour la sauvegarde
function supprimerMatch(nomMatch) {
    let couponSauvegarde = JSON.parse(localStorage.getItem('monCouponFoot')) || [];
    couponSauvegarde = couponSauvegarde.filter(m => m.nom !== nomMatch);
    
    localStorage.setItem('monCouponFoot', JSON.stringify(couponSauvegarde));
    afficherLeCoupon();
}

// Fonction qui dessine le coupon sur l'écran
function afficherLeCoupon() {
    const zone = document.getElementById('selection-matchs');
    let couponSauvegarde = JSON.parse(localStorage.getItem('monCouponFoot')) || [];

    if (couponSauvegarde.length === 0) {
        zone.innerHTML = "Aucun match sélectionné";
        return;
    }

    zone.innerHTML = ""; // On vide pour redessiner proprement
    couponSauvegarde.forEach(m => {
        const div = document.createElement('div');
        div.className = "coupon-item"; // Tu peux ajouter ce style en CSS
        div.style.padding = "10px";
        div.style.borderBottom = "1px solid #333";
        div.innerHTML = `
            ⚽ ${m.nom} | <b>+1.5 buts</b> (${m.proba === 'Perso' ? '⭐' : m.proba + '%'}) 
            <span onclick="supprimerMatch('${m.nom}')" style="color:#f44336; cursor:pointer; float:right; font-weight:bold;">[X]</span>
        `;
        zone.appendChild(div);
    });
}

// ==========================================
// 5. LANCEMENT AU DÉMARRAGE
// ==========================================
afficherLeCoupon(); // On charge le coupon sauvegardé
changerDate(0);      // On charge les matchs d'aujourd'hui