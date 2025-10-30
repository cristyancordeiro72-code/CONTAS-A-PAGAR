import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  X,
  Calendar,
  DollarSign,
  Users,
  Wallet,
  AlertCircle,
  Plus,
  Upload,
  Download,
  LogOut,
  Trash2,
  Edit2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'contas-pagar';
const SALDO_INTER_KEY = 'saldo-inter';
const SALDO_SANTANDER_KEY = 'saldo-santander';

// Storage usando localStorage
const storage = {
  get: async function(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        throw new Error('Key not found');
      }
      return { key: key, value: raw };
    } catch (err) {
      throw err;
    }
  },
  set: async function(key, value) {
    try {
      const toSave = (typeof value === 'string' || typeof value === 'number') ? String(value) : JSON.stringify(value);
      localStorage.setItem(key, toSave);
      return { key: key, value: toSave };
    } catch (err) {
      console.error('storage.set error', err);
      return null;
    }
  }
};

const SistemaContasPagar = () => {
  const [contas, setContas] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [mostrarLogin, setMostrarLogin] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarImportacao, setMostrarImportacao] = useState(false);
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false);
  const [senha, setSenha] = useState('');
  const [contaEditando, setContaEditando] = useState(null);
  const [saldoInter, setSaldoInter] = useState('');
  const [saldoSantander, setSaldoSantander] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const emptyContaDraft = {
    fornecedor: '',
    valor: '',
    detalhamento: '',
    prevPgto: '',
    vencimento: '',
    pix: ''
  };
  const [novaConta, setNovaConta] = useState({ ...emptyContaDraft });
  const [dadosEdicao, setDadosEdicao] = useState({ ...emptyContaDraft });

  const safeGet = async (key) => {
    try {
      const result = await storage.get(key);
      return result.value;
    } catch (err) {
      return null;
    }
  };

  const safeSet = async (key, value) => {
    try {
      const payload = (typeof value === 'string' || typeof value === 'number') ? String(value) : JSON.stringify(value);
      const result = await storage.set(key, payload);
      return result !== null;
    } catch (err) {
      console.error('safeSet error', err);
      return false;
    }
  };

  const getVencimentoStatus = (dataVencimentoStr) => {
    if (!dataVencimentoStr) return 'DESCONHECIDO';
    const partes = dataVencimentoStr.split('/');
    if (partes.length < 3) return 'DESCONHECIDO';
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    let ano = parseInt(partes[2], 10);
    if (!Number.isFinite(dia) || !Number.isFinite(mes) || !Number.isFinite(ano)) return 'DESCONHECIDO';
    if (ano < 100) ano = 2000 + ano;
    const hoje = new Date(); 
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = new Date(ano, mes, dia);
    if (isNaN(dataVenc.getTime())) return 'DESCONHECIDO';
    return dataVenc < hoje ? 'VENCIDO' : 'EM DIA';
  };

  const carregarContas = async () => {
    try {
      const raw = await safeGet(STORAGE_KEY);
      if (!raw) {
        setContas([]);
        await safeSet(STORAGE_KEY, []);
        return;
      }
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const array = Array.isArray(parsed) ? parsed : [];
      const normalizadas = array.map((c) => {
        return {
          ...c,
          vencimento: c.vencimento || '',
          vencimentoStatus: c.vencimentoStatus || getVencimentoStatus(c.vencimento || ''),
          valor: typeof c.valor === 'string' ? parseFloat(c.valor) || 0 : c.valor || 0
        };
      });
      setContas(normalizadas);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      setContas([]);
    }
  };

  const carregarSaldos = async () => {
    try {
      const inter = await safeGet(SALDO_INTER_KEY);
      const sant = await safeGet(SALDO_SANTANDER_KEY);
      if (inter !== null) setSaldoInter(String(inter));
      if (sant !== null) setSaldoSantander(String(sant));
    } catch (error) {
      console.error('Erro ao carregar saldos:', error);
    }
  };

  const salvarContas = async (novasContas) => {
    try {
      const toSave = novasContas.map(c => {
        return {
          ...c,
          valor: typeof c.valor === 'number' ? c.valor : parseFloat(c.valor) || 0
        };
      });
      const ok = await safeSet(STORAGE_KEY, toSave);
      if (ok) setContas(toSave);
      return ok;
    } catch (error) {
      console.error('Erro ao salvar contas:', error);
      return false;
    }
  };

  const salvarSaldos = async () => {
    try {
      await safeSet(SALDO_INTER_KEY, saldoInter || '0');
      await safeSet(SALDO_SANTANDER_KEY, saldoSantander || '0');
      alert('Saldos atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar saldos:', error);
    }
  };

  useEffect(() => {
    carregarContas();
    carregarSaldos();
    const interval = setInterval(() => {
      carregarContas();
      carregarSaldos();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fazerLogin = () => {
    if (senha === 'admin123') {
      setUsuario({ nome: 'Paulo Freire', tipo: 'aprovador' });
      setMostrarLogin(false);
    } else if (senha === 'joab123') {
      setUsuario({ nome: 'Joab Aragão', tipo: 'aprovador' });
      setMostrarLogin(false);
    } else if (senha === 'iury123') {
      setUsuario({ nome: 'Iury Cordeiro', tipo: 'lancador' });
      setMostrarLogin(false);
    } else {
      alert('Senha incorreta!');
    }
  };

  const sair = () => {
    setUsuario(null);
    setMostrarLogin(true);
    setSenha('');
  };

  const lancarConta = async () => {
    if (!novaConta.fornecedor || !novaConta.valor || !novaConta.detalhamento || !novaConta.prevPgto || !novaConta.vencimento) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }
    const conta = {
      id: Date.now() + Math.random() * 100000,
      fornecedor: novaConta.fornecedor,
      valor: parseFloat(String(novaConta.valor).replace(',', '.')) || 0,
      detalhamento: novaConta.detalhamento,
      prevPgto: novaConta.prevPgto,
      vencimento: novaConta.vencimento,
      vencimentoStatus: getVencimentoStatus(novaConta.vencimento),
      pix: novaConta.pix || '',
      situacao: 'A PAGAR',
      lancadoPor: usuario?.nome || '',
      dataLancamento: new Date().toLocaleString('pt-BR')
    };
    const contasAtualizadas = [...contas, conta];
    const ok = await salvarContas(contasAtualizadas);
    if (ok) {
      setNovaConta({ ...emptyContaDraft });
      setMostrarFormulario(false);
      alert('Conta lançada com sucesso!');
    } else {
      alert('Erro ao salvar conta.');
    }
  };

  const excluirConta = async (contaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return;
    try {
      const novasContas = contas.filter(conta => conta.id !== contaId);
      const ok = await salvarContas(novasContas);
      if (ok) {
        alert('Conta excluída com sucesso!');
      } else {
        alert('Erro ao excluir conta.');
        await carregarContas();
      }
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      alert('Erro ao excluir conta.');
      await carregarContas();
    }
  };

  const iniciarEdicao = (conta) => {
    setContaEditando(conta.id);
    setDadosEdicao({
      fornecedor: conta.fornecedor || '',
      valor: String(conta.valor || ''),
      detalhamento: conta.detalhamento || '',
      prevPgto: conta.prevPgto || '',
      vencimento: conta.vencimento || '',
      pix: conta.pix || ''
    });
  };

  const cancelarEdicao = () => {
    setContaEditando(null);
    setDadosEdicao({ ...emptyContaDraft });
  };

  const salvarEdicao = async () => {
    if (!dadosEdicao.fornecedor || !dadosEdicao.valor || !dadosEdicao.detalhamento || !dadosEdicao.prevPgto || !dadosEdicao.vencimento) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }
    try {
      const novasContas = contas.map(c => {
        if (c.id === contaEditando) {
          return {
            ...c,
            fornecedor: dadosEdicao.fornecedor,
            valor: parseFloat(String(dadosEdicao.valor).replace(',', '.')) || 0,
            detalhamento: dadosEdicao.detalhamento,
            prevPgto: dadosEdicao.prevPgto,
            vencimento: dadosEdicao.vencimento,
            vencimentoStatus: getVencimentoStatus(dadosEdicao.vencimento),
            pix: dadosEdicao.pix || '',
            editadoPor: usuario?.nome || '',
            dataEdicao: new Date().toLocaleString('pt-BR')
          };
        }
        return c;
      });
      const ok = await salvarContas(novasContas);
      if (ok) {
        alert('Conta editada com sucesso!');
        cancelarEdicao();
      } else {
        alert('Erro ao editar conta.');
      }
    } catch (error) {
      console.error('Erro ao editar conta:', error);
      alert('Erro ao editar conta.');
    }
  };

  const aprovarConta = async (id) => {
    const novasContas = contas.map(c => {
      if (c.id === id) {
        return {
          ...c, 
          situacao: 'PAGO', 
          aprovadoPor: usuario?.nome || '', 
          dataAprovacao: new Date().toLocaleString('pt-BR')
        };
      }
      return c;
    });
    await salvarContas(novasContas);
  };

  const rejeitarConta = async (id) => {
    const novasContas = contas.map(c => {
      if (c.id === id) {
        return { 
          ...c, 
          situacao: 'REJEITADO', 
          rejeitadoPor: usuario?.nome || '' 
        };
      }
      return c;
    });
    await salvarContas(novasContas);
  };

  // Importação
  const selecionarArquivo = (e) => {
    const arquivo = e.target.files && e.target.files[0];
    if (arquivo) setArquivoSelecionado(arquivo);
  };

  const importarCSVTextoParaContas = (texto) => {
    const linhas = texto.split(/\r?\n/);
    const novasContas = [];
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (!linha) continue;
      const cols = linha.split(/[,;]/).map(s => s.trim());
      if (cols.length < 5) continue;
      const prevPgto = cols[0];
      const fornecedor = cols[1];
      const valorStr = (cols[2] || '').replace(/[^\d,.-]/g, '').replace(',', '.');
      const valor = parseFloat(valorStr);
      const detalhamento = cols[3] || '';
      const vencStr = cols[4] || '';
      const pix = cols[5] || '';
      if (fornecedor && !Number.isNaN(valor) && prevPgto && vencStr) {
        novasContas.push({
          id: Date.now() + Math.random() * 100000 + i,
          prevPgto,
          fornecedor,
          valor,
          detalhamento,
          vencimento: vencStr,
          vencimentoStatus: getVencimentoStatus(vencStr),
          pix,
          situacao: 'A PAGAR',
          lancadoPor: usuario?.nome || '',
          dataLancamento: new Date().toLocaleString('pt-BR')
        });
      }
    }
    return novasContas;
  };

  const importarArquivo = async () => {
    if (!arquivoSelecionado) {
      alert('Selecione um arquivo primeiro!');
      return;
    }

    const extensao = arquivoSelecionado.name.split('.').pop().toLowerCase();

    if (extensao === 'csv') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const texto = evt.target.result;
          const novas = importarCSVTextoParaContas(texto);
          if (novas.length === 0) {
            alert('Nenhuma conta válida encontrada no arquivo!');
            return;
          }
          const contasAtualizadas = [...contas, ...novas];
          await salvarContas(contasAtualizadas);
          alert(`${novas.length} conta(s) importada(s) com sucesso!`);
          setMostrarImportacao(false);
          setArquivoSelecionado(null);
        } catch (error) {
          console.error('Erro ao importar CSV:', error);
          alert('Erro ao importar arquivo CSV. Verifique o formato.');
        }
      };
      reader.readAsText(arquivoSelecionado);
      return;
    }

    if (extensao === 'xlsx' || extensao === 'xls') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          const novasContas = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 5) continue;
            const prevPgto = String(row[0] || '').trim();
            const fornecedor = String(row[1] || '').trim();
            const valorStr = String(row[2] || '').replace(/[^\d,.-]/g, '').replace(',', '.');
            const valor = parseFloat(valorStr);
            const detalhamento = String(row[3] || '').trim();
            const vencStr = String(row[4] || '').trim();
            const pix = String(row[5] || '').trim() || '';
            if (fornecedor && !Number.isNaN(valor) && prevPgto && vencStr) {
              novasContas.push({
                id: Date.now() + Math.random() * 100000 + i,
                prevPgto,
                fornecedor,
                valor,
                detalhamento,
                vencimento: vencStr,
                vencimentoStatus: getVencimentoStatus(vencStr),
                pix,
                situacao: 'A PAGAR',
                lancadoPor: usuario?.nome || '',
                dataLancamento: new Date().toLocaleString('pt-BR')
              });
            }
          }
          if (novasContas.length > 0) {
            const contasAtualizadas = [...contas, ...novasContas];
            await salvarContas(contasAtualizadas);
            alert(`${novasContas.length} conta(s) importada(s) com sucesso!`);
            setMostrarImportacao(false);
            setArquivoSelecionado(null);
          } else {
            alert('Nenhuma conta válida encontrada no arquivo Excel!');
          }
        } catch (error) {
          console.error('Erro ao importar Excel:', error);
          alert('Erro ao importar arquivo Excel. Verifique o formato.');
        }
      };
      reader.readAsArrayBuffer(arquivoSelecionado);
      return;
    }

    alert('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx)');
  };

  const exportarRelatorio = () => {
    if (!dataInicial || !dataFinal) {
      alert('Selecione o período do relatório!');
      return;
    }
    const partesIni = dataInicial.split('/');
    const partesFim = dataFinal.split('/');
    if (partesIni.length < 3 || partesFim.length < 3) {
      alert('Formato de data inválido. Use DD/MM/AAAA');
      return;
    }
    const dtInicio = new Date(parseInt(partesIni[2], 10), parseInt(partesIni[1], 10) - 1, parseInt(partesIni[0], 10));
    const dtFim = new Date(parseInt(partesFim[2], 10), parseInt(partesFim[1], 10) - 1, parseInt(partesFim[0], 10));
    if (isNaN(dtInicio.getTime()) || isNaN(dtFim.getTime())) {
      alert('Data inválida.');
      return;
    }

    const contasFiltradasParaRel = contas.filter(c => {
      if (!c.prevPgto) return false;
      const p = c.prevPgto.split('/');
      if (p.length < 3) return false;
      const ano = parseInt(p[2], 10) < 100 ? 2000 + parseInt(p[2], 10) : parseInt(p[2], 10);
      const dtConta = new Date(ano, parseInt(p[1], 10) - 1, parseInt(p[0], 10));
      return dtConta >= dtInicio && dtConta <= dtFim;
    });

    const dados = contasFiltradasParaRel.map(c => ({
      'Data Prev. Pgto': c.prevPgto || '',
      Fornecedor: c.fornecedor || '',
      Valor: c.valor || 0,
      Descrição: c.detalhamento || '',
      Vencimento: c.vencimento || '',
      'Situação': c.situacao || '',
      PIX: c.pix || '',
      'Lançado por': c.lancadoPor || '',
      'Aprovado por': c.aprovadoPor || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    const filename = `relatorio_${dataInicial.replace(/\//g, '-')}_a_${dataFinal.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
    setMostrarRelatorio(false);
  };

  const contasFiltradas = useMemo(() => {
    if (filtro === 'pendentes') {
      return contas.filter(c => c.situacao !== 'PAGO' && c.situacao !== 'REJEITADO');
    }
    if (filtro === 'vencidos') {
      return contas.filter(c => c.vencimentoStatus === 'VENCIDO' && c.situacao !== 'PAGO');
    }
    return contas;
  }, [contas, filtro]);

  const totalPendente = useMemo(() => {
    return contas.reduce((s, c) => {
      if (c.situacao !== 'PAGO' && c.situacao !== 'REJEITADO') {
        return s + Number(c.valor || 0);
      }
      return s;
    }, 0);
  }, [contas]);

  const totalAtrasado = useMemo(() => {
    return contas.reduce((s, c) => {
      if (c.vencimentoStatus === 'VENCIDO' && c.situacao !== 'PAGO' && c.situacao !== 'REJEITADO') {
        return s + Number(c.valor || 0);
      }
      return s;
    }, 0);
  }, [contas]);

  const saldoTotal = useMemo(() => {
    return (parseFloat(saldoInter) || 0) + (parseFloat(saldoSantander) || 0);
  }, [saldoInter, saldoSantander]);

  if (mostrarLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Contas a Pagar</h1>
          </div>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fazerLogin()}
            className="w-full px-4 py-3 border rounded-lg mb-4"
            placeholder="Senha"
          />
          <button onClick={fazerLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
            Entrar
          </button>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm">
            <p className="font-semibold mb-2">Credenciais:</p>
            <p>Paulo: admin123</p>
            <p>Joab: joab123</p>
            <p>Iury: iury123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Contas a Pagar</h1>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{usuario?.nome}</span>
              <button onClick={sair} className="bg-blue-700 p-2 rounded-full ml-2 hover:bg-blue-800">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Saldo Total</p>
                <p className="text-2xl font-bold text-blue-800">
                  R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Inter</p>
                <p className="text-xl font-bold text-orange-600">
                  R$ {(parseFloat(saldoInter) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Wallet className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Santander</p>
                <p className="text-xl font-bold text-red-600">
                  R$ {(parseFloat(saldoSantander) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Wallet className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pendente</p>
                <p className="text-xl font-bold text-yellow-600">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Em Atraso</p>
                <p className="text-xl font-bold text-red-600">R$ {totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {usuario?.tipo === 'lancador' && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">Atualizar Saldos dos Bancos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Banco Inter</label>
                <input
                  type="number"
                  step="0.01"
                  value={saldoInter}
                  onChange={(e) => setSaldoInter(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Santander</label>
                <input
                  type="number"
                  step="0.01"
                  value={saldoSantander}
                  onChange={(e) => setSaldoSantander(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0,00"
                />
              </div>
              <div className="flex items-end">
                <button onClick={salvarSaldos} className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700">
                  Salvar Saldos
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {(usuario?.tipo === 'lancador' || usuario?.tipo === 'aprovador') && (
            <>
              <button
                onClick={() => { setMostrarFormulario(!mostrarFormulario); setMostrarImportacao(false); setMostrarRelatorio(false); }}
                className="bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 flex items-center justify-center space-x-2"
              >
                <Plus className="w-6 h-6" />
                <span>Lançar Conta</span>
              </button>
              <button
                onClick={() => { setMostrarImportacao(!mostrarImportacao); setMostrarFormulario(false); setMostrarRelatorio(false); }}
                className="bg-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center space-x-2"
              >
                <Upload className="w-6 h-6" />
                <span>Importar Arquivo</span>
              </button>
            </>
          )}
          <button
            onClick={() => { setMostrarRelatorio(!mostrarRelatorio); setMostrarFormulario(false); setMostrarImportacao(false); }}
            className="bg-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-indigo-700 flex items-center justify-center space-x-2"
          >
            <Download className="w-6 h-6" />
            <span>Exportar Relatório</span>
          </button>
        </div>

        {mostrarRelatorio && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Exportar Relatório</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data Inicial</label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Data Final</label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-end space-x-2">
                <button onClick={exportarRelatorio} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700">
                  Exportar
                </button>
                <button onClick={() => setMostrarRelatorio(false)} className="flex-1 bg-gray-300 py-2 rounded-lg font-semibold hover:bg-gray-400">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarImportacao && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Importar Arquivo</h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm mb-2"><strong>Formatos aceitos:</strong> CSV e Excel (.xlsx)</p>
              <p className="text-sm mb-2"><strong>Ordem das colunas (obrigatória):</strong></p>
              <code className="text-xs bg-white px-2 py-1 rounded block mb-2">Data Pgto, Fornecedor, Valor, Descrição, Vencimento, PIX</code>
              <p className="text-xs text-blue-700 mt-2"><strong>Exemplo linha 2:</strong></p>
              <code className="text-xs bg-white px-2 py-1 rounded block">29/10/25, HAPVIDA, 5088.90, Plano de Saúde, 28/10/25, 123.456.789-00</code>
              <p className="text-xs text-red-600 mt-2">⚠️ A primeira linha (cabeçalho) será ignorada</p>
            </div>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={selecionarArquivo}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 mb-4 p-2"
            />

            {arquivoSelecionado && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Arquivo selecionado:</strong> {arquivoSelecionado.name}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={importarArquivo}
                disabled={!arquivoSelecionado}
                className={'flex-1 py-3 rounded-lg font-semibold ' + (arquivoSelecionado ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed')}
              >
                Enviar e Importar
              </button>
              <button
                onClick={() => {
                  setMostrarImportacao(false);
                  setArquivoSelecionado(null);
                }}
                className="flex-1 bg-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {mostrarFormulario && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-6">Lançar Conta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Fornecedor"
                value={novaConta.fornecedor}
                onChange={(e) => setNovaConta({ ...novaConta, fornecedor: e.target.value })}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={novaConta.valor}
                onChange={(e) => setNovaConta({ ...novaConta, valor: e.target.value })}
                className="px-4 py-2 border rounded-lg"
              />
              <textarea
                placeholder="Descrição"
                value={novaConta.detalhamento}
                onChange={(e) => setNovaConta({ ...novaConta, detalhamento: e.target.value })}
                className="md:col-span-2 px-4 py-2 border rounded-lg"
                rows="3"
              />
              <input
                type="text"
                placeholder="Data Pgto (DD/MM/AA)"
                value={novaConta.prevPgto}
                onChange={(e) => setNovaConta({ ...novaConta, prevPgto: e.target.value })}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Vencimento (DD/MM/AA)"
                value={novaConta.vencimento}
                onChange={(e) => setNovaConta({ ...novaConta, vencimento: e.target.value })}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="PIX (opcional)"
                value={novaConta.pix}
                onChange={(e) => setNovaConta({ ...novaConta, pix: e.target.value })}
                className="md:col-span-2 px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex space-x-3 mt-6">
              <button onClick={lancarConta} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
                Confirmar
              </button>
              <button onClick={() => setMostrarFormulario(false)} className="flex-1 bg-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-400">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex space-x-2">
            <button 
              onClick={() => setFiltro('todos')} 
              className={'px-4 py-2 rounded-lg ' + (filtro === 'todos' ? 'bg-blue-600 text-white' : 'bg-gray-100')}
            >
              Todos
            </button>
            <button 
              onClick={() => setFiltro('pendentes')} 
              className={'px-4 py-2 rounded-lg ' + (filtro === 'pendentes' ? 'bg-blue-600 text-white' : 'bg-gray-100')}
            >
              Pendentes
            </button>
            <button 
              onClick={() => setFiltro('vencidos')} 
              className={'px-4 py-2 rounded-lg ' + (filtro === 'vencidos' ? 'bg-blue-600 text-white' : 'bg-gray-100')}
            >
              Vencidos
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {contasFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma conta encontrada</p>
            </div>
          ) : (
            contasFiltradas.map(c => {
              const statusClass = c.situacao === 'PAGO' ? 'bg-green-500 text-white' : (c.situacao === 'REJEITADO' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white');
              
              return (
                <div key={c.id} className="bg-white rounded-xl shadow p-6">
                  {contaEditando === c.id ? (
                    <div>
                      <h3 className="text-xl font-bold mb-4 text-blue-600">Editando Conta</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Fornecedor</label>
                          <input
                            type="text"
                            value={dadosEdicao.fornecedor}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, fornecedor: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Valor</label>
                          <input
                            type="number"
                            step="0.01"
                            value={dadosEdicao.valor}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, valor: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">Descrição</label>
                          <textarea
                            value={dadosEdicao.detalhamento}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, detalhamento: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                            rows="3"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Data Pgto</label>
                          <input
                            type="text"
                            placeholder="DD/MM/AA"
                            value={dadosEdicao.prevPgto}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, prevPgto: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Vencimento</label>
                          <input
                            type="text"
                            placeholder="DD/MM/AA"
                            value={dadosEdicao.vencimento}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, vencimento: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-2">PIX</label>
                          <input
                            type="text"
                            value={dadosEdicao.pix}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, pix: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={salvarEdicao} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">
                          Salvar Alterações
                        </button>
                        <button onClick={cancelarEdicao} className="flex-1 bg-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-400">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{c.fornecedor}</h3>
                          <p className="text-sm text-gray-600">{c.detalhamento}</p>
                        </div>
                        <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + statusClass}>
                          {c.situacao}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-500">Valor</p>
                          <p className="font-semibold text-green-600">R$ {Number(c.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Prev. Pgto</p>
                          <p className="font-semibold">{c.prevPgto}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Vencimento</p>
                          <p className={'font-semibold ' + (c.vencimentoStatus === 'VENCIDO' ? 'text-red-600' : 'text-blue-600')}>
                            {c.vencimento || c.vencimentoStatus}
                          </p>
                        </div>
                      </div>
                      {c.pix && (
                        <div className="mb-4">
                          <p className="text-gray-500 text-sm">PIX</p>
                          <p className="font-semibold text-sm">{c.pix}</p>
                        </div>
                      )}
                      {c.lancadoPor && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <span className="font-semibold">Lançado por:</span> {c.lancadoPor} em {c.dataLancamento}
                          </p>
                        </div>
                      )}
                      {c.editadoPor && (
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-800">
                            <span className="font-semibold">Editado por:</span> {c.editadoPor} em {c.dataEdicao}
                          </p>
                        </div>
                      )}
                      {c.aprovadoPor && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            <span className="font-semibold">Aprovado por:</span> {c.aprovadoPor} em {c.dataAprovacao}
                          </p>
                        </div>
                      )}
                      {usuario?.tipo === 'aprovador' && c.situacao === 'A PAGAR' && (
                        <div className="flex space-x-3">
                          <button onClick={() => aprovarConta(c.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg flex items-center justify-center space-x-2">
                            <Check className="w-5 h-5" />
                            <span>Aprovar</span>
                          </button>
                          <button onClick={() => rejeitarConta(c.id)} className="flex-1 bg-red-600 text-white py-2 rounded-lg flex items-center justify-center space-x-2">
                            <X className="w-5 h-5" />
                            <span>Rejeitar</span>
                          </button>
                        </div>
                      )}
                      {usuario?.tipo === 'lancador' && c.situacao !== 'PAGO' && (
                        <div className="flex space-x-3">
                          <button
                            onClick={() => iniciarEdicao(c)}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700"
                          >
                            <Edit2 className="w-5 h-5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => excluirConta(c.id)}
                            className="flex-1 bg-red-600 text-white py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SistemaContasPagar;
