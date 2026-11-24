// ==========================================
// 1. CONFIGURAÇÕES E VARIÁVEIS DO SISTEMA
// ==========================================
const canvas = document.getElementById('jogoCanvas');
const ctx = canvas.getContext('2d');

const elPontos = document.getElementById('pontos');
const elVidas = document.getElementById('vidas');
const telaFim = document.getElementById('tela-fim');
const msgFim = document.getElementById('mensagem-fim');
const pontuacaoFinal = document.getElementById('pontuacao-final');
const btnReiniciar = document.getElementById('btn-reiniciar');

const GRAVIDADE = 0.55;
const FORCA_PULO = -11.5;
const VELOCIDADE_JOGADOR = 5.2;

let pontos = 0;
let vidas = 3;
let jogoAtivo = true;
let frameContador = 0;

const teclas = {
    esquerda: false,
    direita: false
};

// ==========================================
// 2. ENTIDADES (Astronauta, Fase, Drones)
// ==========================================
const jogador = {
    x: 40,
    y: 340,
    largura: 30,
    altura: 34,
    vx: 0,
    vy: 0,
    pulosRestantes: 2, // Permite Pulo Duplo!
    cor: '#00f3ff'
};

// Estrelas decorativas do fundo
const estrelas = Array.from({ length: 45 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    tamanho: Math.random() * 2 + 1,
    velocidade: Math.random() * 0.5 + 0.2
}));

// Plataformas flutuantes espaciais
const plataformas = [
    { x: 0, y: 415, largura: 800, altura: 35 },   // Base metálica
    { x: 130, y: 330, largura: 130, altura: 16 }, // Plataforma 1
    { x: 340, y: 270, largura: 130, altura: 16 }, // Plataforma 2
    { x: 560, y: 210, largura: 150, altura: 16 }, // Plataforma 3
    { x: 250, y: 140, largura: 140, altura: 16 }, // Plataforma 4 (topo centro)
    { x: 40, y: 180, largura: 110, altura: 16 }   // Plataforma 5 (topo esquerda)
];

// Obstáculos fixos (lasers vermelhos no chão)
const lasers = [
    { x: 270, y: 403, largura: 60, altura: 12 },
    { x: 520, y: 403, largura: 60, altura: 12 }
];

let cristais = [];
let drones = [];
let particulas = [];

function carregarFase() {
    cristais = [
        { x: 195, y: 295, raio: 9, coletada: false },
        { x: 405, y: 235, raio: 9, coletada: false },
        { x: 635, y: 175, raio: 9, coletada: false },
        { x: 320, y: 105, raio: 9, coletada: false },
        { x: 95, y: 145, raio: 9, coletada: false },
        { x: 740, y: 375, raio: 9, coletada: false }
    ];

    drones = [
        { x: 340, y: 375, largura: 32, altura: 22, vx: 2.2, minX: 340, maxX: 500 },
        { x: 560, y: 175, largura: 32, altura: 22, vx: 1.8, minX: 560, maxX: 680 },
        { x: 250, y: 105, largura: 32, altura: 22, vx: 1.6, minX: 250, maxX: 360 }
    ];
    particulas = [];
}

// ==========================================
// 3. CONTROLES E PULO DUPLO
// ==========================================
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') teclas.esquerda = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') teclas.direita = true;
    
    // Dispara o pulo apenas no momento do clique (evita voar segurando)
    if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) {
        executarPulo();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') teclas.esquerda = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') teclas.direita = false;
});

btnReiniciar.addEventListener('click', reiniciarJogo);

function executarPulo() {
    if (!jogoAtivo) return;
    if (jogador.pulosRestantes > 0) {
        jogador.vy = FORCA_PULO;
        jogador.pulosRestantes--;
        criarParticulasJato(jogador.x + jogador.largura / 2, jogador.y + jogador.altura);
    }
}

function criarParticulasJato(x, y) {
    for (let i = 0; i < 8; i++) {
        particulas.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 1,
            vida: 20,
            cor: i % 2 === 0 ? '#00f3ff' : '#ff007f'
        });
    }
}

// ==========================================
// 4. ATUALIZAÇÃO DE FÍSICA E COLISÕES
// ==========================================
function atualizar() {
    frameContador++;

    // Anima estrelas no fundo mesmo no game over
    for (let estrela of estrelas) {
        estrela.x -= estrela.velocidade;
        if (estrela.x < 0) estrela.x = canvas.width;
    }

    if (!jogoAtivo) return;

    // Movimento horizontal
    if (teclas.esquerda) jogador.vx = -VELOCIDADE_JOGADOR;
    else if (teclas.direita) jogador.vx = VELOCIDADE_JOGADOR;
    else jogador.vx = 0;

    jogador.vy += GRAVIDADE;
    jogador.x += jogador.vx;

    // Limites laterais
    if (jogador.x < 0) jogador.x = 0;
    if (jogador.x + jogador.largura > canvas.width) jogador.x = canvas.width - jogador.largura;

    jogador.y += jogador.vy;

    // Colisão com plataformas (recarrega os 2 pulos ao tocar o chão)
    for (let plat of plataformas) {
        if (colidiu(jogador, plat)) {
            if (jogador.vy > 0 && jogador.y + jogador.altura - jogador.vy <= plat.y) {
                jogador.y = plat.y - jogador.altura;
                jogador.vy = 0;
                jogador.pulosRestantes = 2;
            }
        }
    }

    // Colisão com lasers no chão
    for (let laser of lasers) {
        if (colidiu(jogador, laser)) {
            perderEscudo();
        }
    }

    // Coleta de cristais de energia
    let restantes = 0;
    for (let cristal of cristais) {
        if (!cristal.coletada) {
            restantes++;
            const areaCristal = {
                x: cristal.x - cristal.raio,
                y: cristal.y - cristal.raio,
                largura: cristal.raio * 2,
                altura: cristal.raio * 2
            };
            if (colidiu(jogador, areaCristal)) {
                cristal.coletada = true;
                pontos += 150;
                elPontos.textContent = pontos;
                restantes--;
            }
        }
    }

    if (restantes === 0) {
        finalizarJogo(true);
    }

    // Patrulha dos drones inimigos
    for (let drone of drones) {
        drone.x += drone.vx;
        if (drone.x <= drone.minX || drone.x + drone.largura >= drone.maxX) {
            drone.vx *= -1;
        }
        if (colidiu(jogador, drone)) {
            perderEscudo();
        }
    }

    // Atualiza partículas do propulsor
    for (let i = particulas.length - 1; i >= 0; i--) {
        particulas[i].x += particulas[i].vx;
        particulas[i].y += particulas[i].vy;
        particulas[i].vida--;
        if (particulas[i].vida <= 0) particulas.splice(i, 1);
    }
}

function colidiu(a, b) {
    return (
        a.x < b.x + b.largura &&
        a.x + a.largura > b.x &&
        a.y < b.y + b.altura &&
        a.y + a.altura > b.y
    );
}

function perderEscudo() {
    vidas--;
    elVidas.textContent = vidas;
    if (vidas <= 0) {
        finalizarJogo(false);
    } else {
        jogador.x = 40;
        jogador.y = 340;
        jogador.vx = 0;
        jogador.vy = 0;
        jogador.pulosRestantes = 2;
    }
}

function finalizarJogo(vitoria) {
    jogoAtivo = false;
    telaFim.classList.remove('escondido');
    pontuacaoFinal.textContent = `Energia total coletada: ${pontos}`;
    if (vitoria) {
        msgFim.textContent = 'SISTEMA HACKED: VITÓRIA!';
        msgFim.style.color = '#00f3ff';
    } else {
        msgFim.textContent = 'FALHA CRÍTICA: DERROTA!';
        msgFim.style.color = '#ff007f';
    }
}

function reiniciarJogo() {
    pontos = 0;
    vidas = 3;
    elPontos.textContent = pontos;
    elVidas.textContent = vidas;
    jogador.x = 40;
    jogador.y = 340;
    jogador.vx = 0;
    jogador.vy = 0;
    jogador.pulosRestantes = 2;
    carregarFase();
    telaFim.classList.add('escondido');
    jogoAtivo = true;
}

// ==========================================
// 5. RENDERIZAÇÃO GRÁFICA (CANVAS NEON)
// ==========================================
function desenhar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo estrelado
    ctx.fillStyle = '#ffffff';
    for (let estrela of estrelas) {
        ctx.globalAlpha = 0.6;
        ctx.fillRect(estrela.x, estrela.y, estrela.tamanho, estrela.tamanho);
    }
    ctx.globalAlpha = 1.0;

    // Plataformas futuristas
    for (let plat of plataformas) {
        ctx.fillStyle = '#16213e';
        ctx.fillRect(plat.x, plat.y, plat.largura, plat.altura);
        ctx.fillStyle = '#00f3ff'; // Borda neon superior
        ctx.fillRect(plat.x, plat.y, plat.largura, 3);
    }

    // Lasers perigosos no chão (piscando)
    for (let laser of lasers) {
        ctx.fillStyle = frameContador % 10 < 5 ? '#ff003c' : '#ff7b00';
        ctx.fillRect(laser.x, laser.y, laser.largura, laser.altura);
    }

    // Cristais de energia (formato losango flutuante)
    const flutuar = Math.sin(frameContador * 0.1) * 3;
    for (let cristal of cristais) {
        if (!cristal.coletada) {
            ctx.save();
            ctx.translate(cristal.x, cristal.y + flutuar);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#ffbe0b';
            ctx.fillRect(-7, -7, 14, 14);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-7, -7, 14, 14);
            ctx.restore();
        }
    }

    // Partículas do propulsor
    for (let p of particulas) {
        ctx.fillStyle = p.cor;
        ctx.fillRect(p.x, p.y, 4, 4);
    }

    // Drones inimigos
    for (let drone of drones) {
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(drone.x, drone.y, drone.largura, drone.altura);
        // Visor central do drone
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(drone.x + 8, drone.y + 7, 16, 5);
    }

    // Personagem (Ciborgue com visor luminoso)
    ctx.fillStyle = '#e0fbfc';
    ctx.fillRect(jogador.x, jogador.y, jogador.largura, jogador.altura);
    
    // Capacete/Visor neon
    ctx.fillStyle = '#00f3ff';
    const visorX = teclas.esquerda ? jogador.x + 2 : jogador.x + 12;
    ctx.fillRect(visorX, jogador.y + 6, 16, 8);
}

function loopPrincipal() {
    atualizar();
    desenhar();
    requestAnimationFrame(loopPrincipal);
}

carregarFase();
loopPrincipal();
