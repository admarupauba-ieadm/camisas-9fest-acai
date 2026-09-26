import PDFDocument from 'pdfkit';

export function gerarPDF(pedidos, preco, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.pipe(stream);

  const COLORS = {
    header: '#3A0F1E',
    accent: '#7B2C8E',
    gold: '#F2D9A1',
    green: '#4E9A3A',
    yellow: '#D4A017',
    red: '#C0392B',
    text: '#333333',
    lightBg: '#F5F0E8'
  };

  doc.rect(0, 0, doc.page.width, 90).fill(COLORS.header);
  doc.fontSize(18).fillColor('#FFFFFF')
    .text('9\u00BA Fest A\u00E7a\u00ED da AD Marupauba', 40, 20, { align: 'center' });
  doc.fontSize(12).fillColor(COLORS.gold)
    .text('Lista de Pedidos de Camisas', 40, 48, { align: 'center' });

  const now = new Date();
  const dataStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  doc.fontSize(9).fillColor('#CCCCCC')
    .text('Gerado em: ' + dataStr, 40, 68, { align: 'center' });

  let y = 110;

  const colX = [40, 200, 290, 360, 430];
  const colW = [155, 85, 65, 65, 110];
  const headers = ['Nome', 'Genero', 'Tamanho', 'Valor', 'Pagamento'];

  function drawTableHeader() {
    doc.rect(40, y, doc.page.width - 80, 22).fill(COLORS.accent);
    doc.fontSize(9).fillColor('#FFFFFF');
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 4, y + 6, { width: colW[i] - 8 });
    });
    y += 22;
  }

  function checkPage() {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 40;
      drawTableHeader();
    }
  }

  drawTableHeader();

  pedidos.forEach((p, idx) => {
    checkPage();
    const bg = idx % 2 === 0 ? '#FFFFFF' : COLORS.lightBg;
    doc.rect(40, y, doc.page.width - 80, 20).fill(bg);

    doc.fontSize(8).fillColor(COLORS.text);

    const nome = p.nome.length > 28 ? p.nome.substring(0, 28) + '...' : p.nome;
    doc.text(nome, colX[0] + 4, y + 5, { width: colW[0] - 8 });
    doc.text(p.genero, colX[1] + 4, y + 5, { width: colW[1] - 8 });
    doc.text(p.tamanho, colX[2] + 4, y + 5, { width: colW[2] - 8 });
    doc.text('R$ ' + Number(p.valor_camisa).toFixed(2), colX[3] + 4, y + 5, { width: colW[3] - 8 });

    const pct = Number(p.percentual_pago);
    let statusText, statusColor;
    if (pct === 100) {
      statusText = '100% Pago';
      statusColor = COLORS.green;
    } else if (pct === 50) {
      statusText = '50% Pago';
      statusColor = COLORS.yellow;
    } else {
      statusText = 'Pendente (0%)';
      statusColor = COLORS.red;
    }

    doc.rect(colX[4] + 2, y + 3, 14, 14).fill(statusColor);
    doc.fontSize(8).fillColor(COLORS.text)
      .text(statusText, colX[4] + 20, y + 5, { width: colW[4] - 24 });

    y += 20;
  });

  y += 20;
  checkPage();

  doc.rect(40, y, doc.page.width - 80, 25).fill(COLORS.header);
  doc.fontSize(12).fillColor(COLORS.gold)
    .text('Resumo', 50, y + 6);
  y += 30;

  const tamanhos = ['PP', 'P', 'M', 'G', 'GG'];

  doc.fontSize(10).fillColor(COLORS.text);
  doc.text('Total de pedidos: ' + pedidos.length, 50, y);
  y += 18;

  doc.fontSize(9).fillColor(COLORS.accent).text('Por Tamanho e Genero:', 50, y);
  y += 15;

  doc.rect(50, y, doc.page.width - 100, 18).fill(COLORS.accent);
  doc.fontSize(8).fillColor('#FFFFFF');
  doc.text('Tamanho', 55, y + 4, { width: 70 });
  doc.text('Masculino', 130, y + 4, { width: 70 });
  doc.text('Feminino', 210, y + 4, { width: 70 });
  doc.text('Total', 290, y + 4, { width: 70 });
  y += 18;

  tamanhos.forEach((tam, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : COLORS.lightBg;
    doc.rect(50, y, doc.page.width - 100, 16).fill(bg);
    doc.fillColor(COLORS.text).fontSize(8);

    const masc = pedidos.filter(p => p.tamanho === tam && p.genero === 'Masculino').length;
    const fem = pedidos.filter(p => p.tamanho === tam && p.genero === 'Feminino').length;

    doc.text(tam, 55, y + 4, { width: 70 });
    doc.text(String(masc), 130, y + 4, { width: 70 });
    doc.text(String(fem), 210, y + 4, { width: 70 });
    doc.text(String(masc + fem), 290, y + 4, { width: 70 });
    y += 16;
  });

  y += 15;
  checkPage();

  const totalArrecadado = pedidos.reduce((s, p) => s + Number(p.valor_pago), 0);
  const totalGeral = pedidos.reduce((s, p) => s + Number(p.valor_camisa), 0);
  const totalPendente = totalGeral - totalArrecadado;

  doc.fontSize(10).fillColor(COLORS.green)
    .text('Valor total arrecadado: R$ ' + totalArrecadado.toFixed(2), 50, y);
  y += 16;
  doc.fontSize(10).fillColor(COLORS.red)
    .text('Valor total pendente: R$ ' + totalPendente.toFixed(2), 50, y);
  y += 16;
  doc.fontSize(10).fillColor(COLORS.text)
    .text('Valor total geral: R$ ' + totalGeral.toFixed(2), 50, y);

  doc.end();
}
