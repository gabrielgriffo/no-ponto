import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
  LinearProgress,
  Card,
  CardContent,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton
} from '@mui/material';
import { Schedule, AccessTime, Work, NotificationsActive, ExpandMore, Settings as SettingsIcon, Download } from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Store } from '@tauri-apps/plugin-store';
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { format, differenceInMinutes, parse, addHours } from 'date-fns';
import CustomNotification from './components/CustomNotification';
import Settings from './components/Settings';

// Extend window object for Tauri
declare global {
  interface Window {
    __TAURI__: any;
  }
}

interface TimeData {
  inicio1: string;
  fim1: string;
  inicio2: string;
}

interface WorkStatus {
  remainingTime: string;
  endTime: string;
  isComplete: boolean;
  totalWorked: string;
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
    },
    secondary: {
      main: '#f59e0b',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#1e293b',
    },
    h6: {
      fontWeight: 600,
      color: '#475569',
    },
    body2: {
      color: '#64748b',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

function App() {
  // Função de validação da sequência de horários
  const validateTimeSequence = (data: TimeData) => {
    const { inicio1, fim1, inicio2 } = data;
    
    // Verifica se um campo está completo (formato HH:MM)
    const isCompleteTime = (time: string): boolean => {
      return !!(time && time.length === 5 && time.includes(':'));
    };
    
    // Converte horários para minutos para comparação
    const timeToMinutes = (time: string): number => {
      if (!isCompleteTime(time)) return -1;
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const inicio1Complete = isCompleteTime(inicio1);
    const fim1Complete = isCompleteTime(fim1);
    const inicio2Complete = isCompleteTime(inicio2);

    const inicio1Minutes = timeToMinutes(inicio1);
    const fim1Minutes = timeToMinutes(fim1);
    const inicio2Minutes = timeToMinutes(inicio2);

    const errors: { [key: string]: boolean } = {};
    
    // Validações que só precisam de 2 campos completos
    if (inicio1Complete && fim1Complete) {
      // Início 1 deve ser diferente de Fim 1
      if (inicio1Minutes === fim1Minutes) {
        errors.inicio1 = true;
        errors.fim1 = true;
      }
      
      // Início 1 deve ser menor que Fim 1
      if (inicio1Minutes >= fim1Minutes) {
        errors.inicio1 = true;
        errors.fim1 = true;
      }
    }
    
    // Validações que envolvem início 2
    if (inicio2Complete) {
      // Início 2 deve ser diferente do início 1
      if (inicio1Complete && inicio2Minutes === inicio1Minutes) {
        errors.inicio2 = true;
      }
      
      // Início 2 deve ser diferente do fim 1
      if (fim1Complete && inicio2Minutes === fim1Minutes) {
        errors.inicio2 = true;
      }
      
      // Início 2 deve ser maior que Fim 1 (após intervalo)
      if (fim1Complete && inicio2Minutes <= fim1Minutes) {
        errors.inicio2 = true;
        errors.fim1 = true;
      }
    }

    // Para considerar válido para o botão, todos os campos devem estar completos e sem erros
    const allFieldsComplete = inicio1Complete && fim1Complete && inicio2Complete;
    const isValid = allFieldsComplete && Object.keys(errors).length === 0;
    
    return { isValid, errors };
  };

  const [timeData, setTimeData] = useState<TimeData>({
    inicio1: '',
    fim1: '',
    inicio2: ''
  });
  const [workStatus, setWorkStatus] = useState<WorkStatus | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
  }>({
    open: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [isLoadingHours, setIsLoadingHours] = useState<boolean>(false);
  
  // Validação da sequência de horários
  const validation = validateTimeSequence(timeData);

  const calculateProgress = () => {
    if (!workStatus) return 0;
    
    // Parse total worked time
    const totalWorkedMatch = workStatus.totalWorked.match(/(\d+)h\s*(\d+)m/);
    if (!totalWorkedMatch) return 0;
    
    const hoursWorked = parseInt(totalWorkedMatch[1]);
    const minutesWorked = parseInt(totalWorkedMatch[2]);
    const totalMinutesWorked = hoursWorked * 60 + minutesWorked;
    
    const targetMinutes = 8 * 60; // 8 horas em minutos (480 minutos)
    
    // Se completou exatamente 8 horas ou mais, retorna 100%
    if (totalMinutesWorked >= targetMinutes) {
      return 100;
    }
    
    // Caso contrário, calcula a porcentagem real sem arredondar para 100%
    const progress = (totalMinutesWorked / targetMinutes) * 100;
    
    return progress;
  };

  useEffect(() => {
    // Disable right-click context menu in production
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Only disable in production build (check if running in Tauri)
    if (window.__TAURI__) {
      document.addEventListener('contextmenu', handleContextMenu);
    }

    const initStore = async () => {
      try {
        const storeInstance = await Store.load('noponto.dat');
        setStore(storeInstance);
        
        // Load saved data
        const savedData = await storeInstance.get<TimeData>('timeData');
        if (savedData) {
          setTimeData(savedData);
        }
      } catch (error) {
        console.error('Error initializing store:', error);
      }
    };

    const initNotifications = async () => {
      // Request notification permission
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      console.log('Notification permission granted:', permissionGranted);
    };

    initStore();
    initNotifications();

    // Setup event listeners for work completion
    const setupEventListeners = async () => {
      const unlisten1 = await listen('work_complete', () => {
        setNotification({
          open: true,
          title: '🎉 Jornada Completa!',
          message: 'Parabéns! Você completou suas 8 horas de trabalho. Tenha um ótimo resto do dia!',
          type: 'success'
        });
      });

      const unlisten2 = await listen('work_almost_complete', (event) => {
        const remaining = event.payload as number;
        setNotification({
          open: true,
          title: '⏰ Quase Acabando!',
          message: `Faltam apenas ${remaining} minutos para completar sua jornada!`,
          type: 'warning'
        });
      });


      return () => {
        unlisten1();
        unlisten2();
      };
    };

    const cleanupListeners = setupEventListeners();

    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearInterval(interval);
      cleanupListeners.then(cleanup => cleanup());
      // Remove context menu listener
      if (window.__TAURI__) {
        document.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, []);

  useEffect(() => {
    if (isMonitoring && timeData.inicio1 && timeData.fim1 && timeData.inicio2) {
      calculateWorkStatus();
    } else if (!isMonitoring) {
      setWorkStatus(null);
    }
  }, [timeData, currentTime, isMonitoring]);

  const calculateWorkStatus = () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const start1 = parse(`${today} ${timeData.inicio1}`, 'yyyy-MM-dd HH:mm', new Date());
      const end1 = parse(`${today} ${timeData.fim1}`, 'yyyy-MM-dd HH:mm', new Date());
      const start2 = parse(`${today} ${timeData.inicio2}`, 'yyyy-MM-dd HH:mm', new Date());
      
      // Calculate worked time in first period
      const workedPeriod1 = differenceInMinutes(end1, start1);
      
      // Calculate worked time in second period (until now or until 8h total)
      const now = new Date();
      const totalTargetMinutes = 8 * 60; // 8 hours in minutes
      
      let workedPeriod2 = 0;
      if (now > start2) {
        workedPeriod2 = differenceInMinutes(now, start2);
      }
      
      const totalWorked = workedPeriod1 + workedPeriod2;
      const remainingMinutes = totalTargetMinutes - totalWorked;
      
      // Calculate end time
      const endTime = addHours(start2, remainingMinutes / 60);
      
      setWorkStatus({
        remainingTime: remainingMinutes > 0 ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m` : '0h 0m',
        endTime: format(endTime, 'HH:mm'),
        isComplete: remainingMinutes <= 0,
        totalWorked: `${Math.floor(totalWorked / 60)}h ${totalWorked % 60}m`
      });

      // Show notifications based on remaining time
      if (remainingMinutes <= 0 && !notification.open) {
        setNotification({
          open: true,
          title: '🎉 Jornada Completa!',
          message: 'Parabéns! Você completou suas 8 horas de trabalho. Tenha um ótimo resto do dia!',
          type: 'success'
        });
        invoke('notify_work_complete').catch(console.error);
      } else if (remainingMinutes <= 3 && remainingMinutes > 0 && !notification.open) {
        setNotification({
          open: true,
          title: '⏰ Quase Acabando!',
          message: `Faltam apenas ${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m para completar sua jornada!`,
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('Error calculating work status:', error);
    }
  };

  const validateTimeInput = (value: string): string => {
    // Remove tudo que não é número
    let numbers = value.replace(/[^0-9]/g, '');
    
    // Limita a 4 dígitos
    if (numbers.length > 4) {
      numbers = numbers.slice(0, 4);
    }
    
    if (numbers.length === 0) return '';
    
    // Valida primeira posição (horas - dezena)
    if (numbers.length >= 1) {
      const firstDigit = parseInt(numbers[0]);
      if (firstDigit > 2) {
        numbers = numbers.slice(1); // Remove o primeiro dígito inválido
      }
    }
    
    // Valida segunda posição (horas - unidade)
    if (numbers.length >= 2) {
      const hoursTens = parseInt(numbers[0]);
      const hoursUnits = parseInt(numbers[1]);
      
      // Se primeiro dígito é 2, segundo só pode ser 0, 1, 2 ou 3 (máximo 23h)
      if (hoursTens === 2 && hoursUnits > 3) {
        numbers = numbers[0] + numbers.slice(2); // Remove o segundo dígito inválido
      }
    }
    
    // Valida terceira posição (minutos - dezena)
    if (numbers.length >= 3) {
      const minutesTens = parseInt(numbers[2]);
      if (minutesTens > 5) {
        numbers = numbers.slice(0, 2) + numbers.slice(3); // Remove o terceiro dígito inválido
      }
    }
    
    // Valida quarta posição (minutos - unidade) - sempre válido (0-9)
    
    // Adiciona os dois pontos automaticamente
    if (numbers.length >= 3) {
      return numbers.slice(0, 2) + ':' + numbers.slice(2);
    } else if (numbers.length >= 1) {
      return numbers;
    }
    
    return '';
  };

  const handleTimeChange = (field: keyof TimeData, value: string) => {
    const validatedValue = validateTimeInput(value);
    const newTimeData = { ...timeData, [field]: validatedValue };
    setTimeData(newTimeData);
    
    if (store) {
      store.set('timeData', newTimeData);
    }
  };

  const handleToggleMonitoring = async () => {
    if (!timeData.inicio1 || !timeData.fim1 || !timeData.inicio2 || !validation.isValid) {
      return;
    }

    if (isMonitoring) {
      // Desativar monitoramento
      setIsMonitoring(false);
      setWorkStatus(null);
      try {
        await invoke('stop_work_monitoring');
      } catch (error) {
        console.error('Error stopping work monitoring:', error);
      }
    } else {
      // Iniciar monitoramento
      setIsMonitoring(true);
      try {
        await invoke('start_work_monitoring', {
          inicio1: timeData.inicio1,
          fim1: timeData.fim1,
          inicio2: timeData.inicio2
        });
      } catch (error) {
        console.error('Error starting work monitoring:', error);
        setIsMonitoring(false);
      }
    }
  };

  const handleTestNotification = async () => {
    try {
      // Test both system and overlay notifications
      await Promise.all([
        invoke('show_system_notification', {
          title: '🧪 Teste de Notificação do Sistema!',
          message: 'Esta é uma notificação nativa do sistema operacional!'
        }),
        invoke('show_overlay_notification', {
          title: '🧪 Teste de Notificação Overlay!',
          message: 'Esta é uma notificação personalizada do aplicativo!'
        })
      ]);
    } catch (error) {
      console.error('Error testing notification:', error);
    }
  };

  const handleFetchHours = async () => {
    if (isMonitoring) {
      setNotification({
        open: true,
        title: '⚠️ Monitoramento Ativo',
        message: 'Pare o monitoramento antes de importar novos horários.',
        type: 'warning'
      });
      return;
    }

    setIsLoadingHours(true);
    setNotification({ open: false, title: '', message: '', type: 'info' });

    try {
      const hours = await invoke<string[]>('fetch_pontomais_hours');

      if (hours.length === 0) {
        setNotification({
          open: true,
          title: '📋 Nenhum Registro',
          message: 'Não foram encontrados registros de ponto para hoje.',
          type: 'info'
        });
        return;
      }

      if (hours.length >= 4) {
        setNotification({
          open: true,
          title: '⚠️ Muitos Registros',
          message: `Foram encontrados ${hours.length} registros. Já foram feitos 4 ou mais registros de ponto hoje.`,
          type: 'warning'
        });
        return;
      }

      // Preencher os campos baseado na quantidade de horários
      const newTimeData = { ...timeData };

      if (hours.length >= 1) {
        newTimeData.inicio1 = hours[0];
      }
      if (hours.length >= 2) {
        newTimeData.fim1 = hours[1];
      }
      if (hours.length >= 3) {
        newTimeData.inicio2 = hours[2];
      }

      setTimeData(newTimeData);

      // Salvar no store
      if (store) {
        store.set('timeData', newTimeData);
      }

      setNotification({
        open: true,
        title: '✅ Horários Importados',
        message: `${hours.length} horário(s) foram importados com sucesso do PontoMais.`,
        type: 'success'
      });

    } catch (error) {
      console.error('Error fetching hours:', error);
      setNotification({
        open: true,
        title: '❌ Erro na Importação',
        message: typeof error === 'string' ? error : 'Erro ao buscar horários do PontoMais.',
        type: 'error'
      });
    } finally {
      setIsLoadingHours(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>
        {`
          /* Custom time input styling */
          input[type="text"]::placeholder {
            color: #94a3b8;
            opacity: 0.7;
          }
          
          /* Disable text selection for app-like experience */
          * {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          
          /* Allow text selection only for input fields */
          input, textarea {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
          
          /* Prevent drag and drop */
          * {
            -webkit-user-drag: none;
            -khtml-user-drag: none;
            -moz-user-drag: none;
            -o-user-drag: none;
            user-drag: none;
          }
        `}
      </style>
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: 'background.default',
        py: 1
      }}>
        <Container maxWidth={false} sx={{ width: '580px', margin: '0 auto' }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 2, position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
              <IconButton
                onClick={() => setSettingsOpen(true)}
                sx={{
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'white'
                  }
                }}
                aria-label="Configurações"
              >
                <SettingsIcon />
              </IconButton>
            </Box>

            <Typography
              variant="h4"
              component="h1"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                mb: 1,
                fontWeight: 600
              }}
            >
              <Schedule sx={{ fontSize: 32, color: 'primary.main' }} />
              Registro de Ponto
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Registre seus horários e acompanhe o progresso da jornada de trabalho
            </Typography>
          </Box>

          {/* Horários do Dia */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 , justifyContent: 'center'}}>
                <AccessTime sx={{ fontSize: 20 }} />
                Horários do Dia
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Início 1
                  </Typography>
                  <TextField
                    type="text"
                    placeholder="HH:MM"
                    value={timeData.inicio1}
                    onChange={(e) => handleTimeChange('inicio1', e.target.value)}
                    variant="outlined"
                    size="small"
                    disabled={isMonitoring}
                    error={validation.errors.inicio1 || false}
                    autoComplete="off"
                    inputProps={{
                      maxLength: 5,
                      pattern: '[0-2][0-9]:[0-5][0-9]',
                      autoComplete: 'off'
                    }}
                    sx={{
                      width: '130px',
                      '& .MuiInputBase-input': {
                        fontSize: '1.1rem',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Fim 1
                  </Typography>
                  <TextField
                    type="text"
                    placeholder="HH:MM"
                    value={timeData.fim1}
                    onChange={(e) => handleTimeChange('fim1', e.target.value)}
                    variant="outlined"
                    size="small"
                    disabled={isMonitoring}
                    error={validation.errors.fim1 || false}
                    autoComplete="off"
                    inputProps={{
                      maxLength: 5,
                      pattern: '[0-2][0-9]:[0-5][0-9]',
                      autoComplete: 'off'
                    }}
                    sx={{
                      width: '130px',
                      '& .MuiInputBase-input': {
                        fontSize: '1.1rem',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Início 2
                  </Typography>
                  <TextField
                    type="text"
                    placeholder="HH:MM"
                    value={timeData.inicio2}
                    onChange={(e) => handleTimeChange('inicio2', e.target.value)}
                    variant="outlined"
                    size="small"
                    disabled={isMonitoring}
                    error={validation.errors.inicio2 || false}
                    autoComplete="off"
                    inputProps={{
                      maxLength: 5,
                      pattern: '[0-2][0-9]:[0-5][0-9]',
                      autoComplete: 'off'
                    }}
                    sx={{
                      width: '130px',
                      '& .MuiInputBase-input': {
                        fontSize: '1.1rem',
                        textAlign: 'center',
                        fontFamily: 'monospace'
                      }
                    }}
                  />
                </Box>
              </Box>

              {/* Botões */}
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <Button
                  variant={isMonitoring ? "outlined" : "contained"}
                  onClick={handleToggleMonitoring}
                  disabled={!timeData.inicio1 || !timeData.fim1 || !timeData.inicio2 || !validation.isValid}
                  startIcon={<Work />}
                  color={isMonitoring ? "error" : "primary"}
                  sx={{ minWidth: 200, width: '250px' }}
                >
                  {isMonitoring ? 'Desativar Monitoramento' : 'Iniciar Monitoramento'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleFetchHours}
                  disabled={isLoadingHours || isMonitoring}
                  startIcon={<Download />}
                  color="info"
                  sx={{ minWidth: 160, width: '250px' }}
                >
                  {isLoadingHours ? 'Buscando...' : 'Importar do PontoMais'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleTestNotification}
                  startIcon={<NotificationsActive />}
                  color="secondary"
                  sx={{ minWidth: 160, width: '250px' }}
                >
                  Testar Notificação
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Progresso da Jornada */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Progresso da Jornada</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                  {(() => {
                    const progress = calculateProgress();
                    // Se for exatamente 100%, mostra 100%
                    if (progress === 100) return '100';
                    // Caso contrário, arredonda para baixo para não mostrar 100% prematuramente
                    return Math.floor(progress).toString();
                  })()}%
                </Typography>
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={calculateProgress()} 
                sx={{ 
                  height: 12, 
                  borderRadius: 6,
                  backgroundColor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 6,
                    background: calculateProgress() === 100 
                      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)'
                  }
                }}
              />
              
              {workStatus && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {workStatus.isComplete 
                      ? `Jornada completa! Finalizada às ${workStatus.endTime}`
                      : `Faltam ${workStatus.remainingTime} para completar 8 horas`
                    }
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Cards de Tempo */}
          {workStatus && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700, 
                      color: '#3b82f6',
                      mb: 1
                    }}>
                      {workStatus.totalWorked}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Tempo Trabalhado
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700, 
                      color: workStatus.isComplete ? '#10b981' : '#f59e0b',
                      mb: 1
                    }}>
                      {workStatus.isComplete ? workStatus.endTime : workStatus.remainingTime}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {workStatus.isComplete ? "Finalizado às" : "Tempo Restante"}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}

          {/* Como usar */}
          <Accordion 
            defaultExpanded={false} 
            sx={{ 
              mt: 2,
              position: 'static !important'
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="como-usar-content"
              id="como-usar-header"
            >
              <Typography variant="h6">Como usar</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1 }}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  • Insira o horário de início do primeiro período
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  • Insira o horário de fim do primeiro período (intervalo)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  • Insira o horário de início do segundo período (retorno)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  • Clique em "Iniciar Monitoramento" para começar o acompanhamento
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  • O sistema calculará automaticamente o tempo trabalhado
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  • Você será notificado quando completar 8 horas
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Alertas */}
          {workStatus && (
            <Alert 
              severity={workStatus.isComplete ? "success" : "info"} 
              sx={{ mt: 2 }}
            >
              {workStatus.isComplete 
                ? "🎉 Jornada de trabalho completa!" 
                : "⏰ Monitorando jornada de trabalho..."
              }
            </Alert>
          )}
        </Container>
      </Box>
      
      <CustomNotification
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </ThemeProvider>
  );
}

export default App;