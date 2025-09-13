# NoPonto - Controle de Ponto Inteligente

**NoPonto** é um aplicativo desktop para controle e monitoramento de jornada de trabalho, desenvolvido com tecnologias modernas (Tauri + React + TypeScript). O aplicativo permite registrar horários de entrada e saída, monitora automaticamente o progresso da jornada e notifica quando a meta de 8 horas é atingida.

## 🎯 **Objetivo**

O NoPonto foi criado para profissionais que precisam controlar sua jornada de trabalho de forma precisa e automática, eliminando a necessidade de cálculos manuais e garantindo notificações em tempo real sobre o progresso da jornada.

## ⚡ **Principais Funcionalidades**

### **📝 Registro de Horários**
- **Interface intuitiva** para inserção de horários no formato HH:MM
- **Validação automática** dos horários para evitar inconsistências
- **Suporte a jornada dividida**: manhã (início-fim) + tarde (início até completar 8h)
- **Persistência de dados**: os horários ficam salvos automaticamente

### **📊 Monitoramento em Tempo Real**
- **Cálculo automático** do tempo trabalhado e tempo restante
- **Barra de progresso visual** mostrando a evolução da jornada
- **Atualização em tempo real** a cada minuto
- **Estimativa de horário de conclusão** baseada no tempo restante

### **🔔 Sistema de Notificações Duplas**
- **Notificações nativas do sistema operacional**: aparecem no centro superior da tela
- **Notificações personalizadas do aplicativo**: interface customizada com sons
- **Alertas automáticos**:
  - Aviso quando faltam 3 minutos para completar a jornada
  - Notificação de jornada completa ao atingir 8 horas

### **🎵 Feedback Sonoro**
- **Sons personalizados** para diferentes tipos de notificação
- **Uso da Web Audio API** para garantia de reprodução
- **Tom de sucesso** diferenciado para jornada completa

### **⚙️ Funcionamento em Background**
- **Sistema de bandeja**: aplicativo continua rodando mesmo quando a janela é fechada
- **Monitoramento contínuo**: o controle de tempo continua ativo em segundo plano
- **Menu da bandeja**:
  - "Mostrar": retorna a janela ao foco
  - "Sair": encerra completamente o aplicativo

## 🏗️ **Como Funciona**

### **1. Configuração dos Horários**
1. **Início 1**: Horário de entrada pela manhã (ex: 08:00)
2. **Fim 1**: Horário de saída para almoço (ex: 12:00)
3. **Início 2**: Horário de retorno do almoço (ex: 13:00)

### **2. Cálculo Automático**
O aplicativo calcula automaticamente:
- **Tempo trabalhado no primeiro período** (Fim 1 - Início 1)
- **Tempo necessário no segundo período** para completar 8 horas
- **Horário estimado de conclusão** (Início 2 + tempo necessário restante)

### **3. Monitoramento Ativo**
Após iniciar o monitoramento:
- **Atualização contínua** do progresso a cada minuto
- **Cálculos em tempo real** do tempo trabalhado e restante
- **Emissão de eventos** para notificações automáticas

### **4. Notificações Inteligentes**
- **3 minutos antes**: "⏰ Quase Acabando! Faltam apenas X minutos..."
- **Jornada completa**: "🎉 Jornada Completa! Parabéns! Você completou suas 8 horas..."

## 📱 **Interface do Usuário**

### **Design Moderno e Limpo**
- **Material-UI**: componentes consistentes e profissionais
- **Cores suaves**: interface amigável aos olhos
- **Tipografia legível**: fonte Inter para melhor legibilidade
- **Ícones informativos**: representação visual clara das funcionalidades

### **Componentes Principais**
- **Campos de horário**: validação em tempo real com feedback visual
- **Barra de progresso**: indicador visual colorido (azul → verde quando completo)
- **Cards informativos**: exibição clara do tempo trabalhado e restante
- **Botões de ação**: "Iniciar/Desativar Monitoramento" e "Testar Notificação"

### **Estados Visuais**
- **Campos com erro**: destaque vermelho para horários inválidos
- **Progresso ativo**: barra azul com porcentagem em tempo real
- **Jornada completa**: barra verde com celebração visual

## 🔧 **Tecnologias Utilizadas**

### **Frontend**
- **React 18**: biblioteca moderna para interfaces reativas
- **TypeScript**: tipagem estática para maior robustez
- **Material-UI v7**: sistema de design profissional
- **date-fns**: manipulação precisa de datas e horários
- **Vite**: build tool rápida para desenvolvimento

### **Backend**
- **Rust**: linguagem performática para lógica de negócio
- **Tauri 2.0**: framework para aplicações desktop multiplataforma
- **Chrono**: biblioteca Rust para manipulação de tempo
- **Tokio**: runtime assíncrono para tarefas em background

### **Integração e Recursos**
- **Tauri IPC**: comunicação eficiente entre frontend e backend
- **Sistema de bandeja**: integração nativa com o sistema operacional
- **Notificações nativas**: integração com o centro de notificações do OS
- **Persistência local**: armazenamento automático usando Tauri Store Plugin

## 🚀 **Vantagens do NoPonto**

### **⏰ Precisão**
- Cálculos exatos baseados em timestamps
- Atualização automática sem interferência manual
- Validação de dados para evitar erros

### **🎯 Praticidade**
- Interface simples e intuitiva
- Funcionamento automático após configuração inicial
- Notificações garantem que você não perca o horário ideal

### **💻 Performance**
- Aplicativo nativo com baixo consumo de recursos
- Arquitetura assíncrona para operações não bloqueantes
- Interface responsiva e fluida

### **🔒 Privacidade**
- Todos os dados ficam salvos localmente
- Nenhuma informação é enviada para servidores externos
- Controle total sobre seus dados de ponto

### **🌐 Multiplataforma**
- Compatível com Windows, macOS e Linux
- Interface consistente entre sistemas operacionais
- Integração nativa com recursos de cada plataforma

## 📋 **Casos de Uso Ideais**

- **Profissionais remotos** que precisam controlar rigorosamente sua jornada
- **Freelancers** que trabalham por horas e precisam de precisão
- **Consultores** que precisam reportar horas trabalhadas
- **Qualquer profissional** que deseja automatizar o controle de ponto pessoal

O NoPonto transforma o controle manual de ponto em um processo automatizado, inteligente e confiável, permitindo que você foque no seu trabalho sem se preocupar com cálculos de horário.