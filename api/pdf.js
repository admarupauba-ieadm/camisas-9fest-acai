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
    lightBg: '#F5F0E8',
    nameBg: '#EDE3D5'
  };

  doc.rect(0, 0, doc.page.width, 90).fill(COLORS.header);
  doc.fontSize(18).fillColor('#FFFFFF')
    .text('9\u00BA Fest A\u00E7a\u00ED da AD Marupa\u00FAba', 40, 20, { align: 'center' });
  doc.fontSize(12).fillColor(COLORS.gold)
    .text('Lista de Pedidos de Camisas', 40, 48, { align: 'center' });

  const now = new Date();
  const dataStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
  doc.fontSize(9).fillColor('#CCCCCC')
    .text('Gerado em: ' + dataStr, 40, 68, { align: 'center' });

  let y = 110;

  function checkPage(needed = 40) {
    if (y > doc.page.height - needed) {
      doc.addPage();
      y = 40;
    }
  }

  const grupos = new Map();
  pedidos.forEach(p => {
    if (!grupos.has(p.nome)) grupos.set(p.nome, []);
    grupos.get(p.nome).push(p);
  });

  const colX = [60, 200, 280, 340, 420];
  const colW = [135, 75, 55, 75, 100];
  const subHeaders = ['G\u00EAnero', 'Tamanho', 'Valor', 'Pagamento'];

  let pessoaIdx = 0;
  const totalPessoas = grupos.size;

  doc.fontSize(10).fillColor(COLORS.text)
    .text(`Total: ${totalPessoas} pessoa${totalPessoas !== 1 ? 's' : ''} - ${pedidos.length} camisa${pedidos.length !== 1 ? 's' : ''}`, 40, y);
  y += 20;

  for (const [nome, camisas] of grupos) {
    checkPage(60);

    doc.rect(40, y, doc.page.width - 80, 22).fill(COLORS.accent);
    doc.fontSize(10).fillColor('#FFFFFF');
    const nomeDisplay = nome.length > 35 ? nome.substring(0, 35) + '...' : nome;
    doc.text(nomeDisplay, 48, y + 5, { continued: false });
    doc.fontSize(8).fillColor(COLORS.gold)
      .text(`${camisas.length} camisa${camisas.length > 1 ? 's' : ''}`, doc.page.width - 140, y + 6, { width: 90, align: 'right' });
    y += 22;

    camisas.forEach((p, idx) => {
      checkPage();
      const bg = idx % 2 === 0 ? '#FFFFFF' : COLORS.lightBg;
      doc.rect(40, y, doc.page.width - 80, 20).fill(bg);
      doc.fontSize(8).fillColor(COLORS.text);

      doc.text(p.genero, colX[0] + 4, y + 5, { width: colW[0] - 8 });
      doc.text(p.tamanho, colX[1] + 4, y + 5, { width: colW[1] - 8 });
      doc.text('R$ ' + Number(p.valor_camisa).toFixed(2), colX[2] + 4, y + 5, { width: colW[2] - 8 });

      const pct = Number(p.percentual_pago);
      let statusText, statusColor;
      if (pct === 100) { statusText = '100% Pago'; statusColor = COLORS.green; }
      else if (pct === 50) { statusText = '50% Pago'; statusColor = COLORS.yellow; }
      else { statusText = 'Pendente'; statusColor = COLORS.red; }

      doc.rect(colX[3] + 2, y + 3, 14, 14).fill(statusColor);
      doc.fontSize(8).fillColor(COLORS.text)
        .text(statusText, colX[3] + 20, y + 5, { width: colW[3] - 24 });

      doc.text('R$ ' + Number(p.valor_pago).toFixed(2), colX[4] + 4, y + 5, { width: colW[4] - 8 });

      y += 20;
    });

    y += 6;
    pessoaIdx++;
  }

  y += 15;
  checkPage(120);

  doc.rect(40, y, doc.page.width - 80, 25).fill(COLORS.header);
  doc.fontSize(12).fillColor(COLORS.gold).text('Resumo', 50, y + 6);
  y += 30;

  const tamanhos = ['PP', 'P', 'M', 'G', 'GG'];

  doc.fontSize(10).fillColor(COLORS.text);
  doc.text(`Total: ${totalPessoas} pessoa${totalPessoas !== 1 ? 's' : ''} / ${pedidos.length} camisa${pedidos.length !== 1 ? 's' : ''}`, 50, y);
  y += 18;

  doc.fontSize(9).fillColor(COLORS.accent).text('Por Tamanho e G\u00EAnero:', 50, y);
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
  checkPage(60);

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
