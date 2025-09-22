import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Stack,
  IconButton,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff, Science, Save, Close } from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

interface PontoMaisConfig {
  employeeId: string;
  accessToken: string;
  client: string;
  uid: string;
  uuid: string;
}

function Settings({ open, onClose }: SettingsProps) {
  const [config, setConfig] = useState<PontoMaisConfig>({
    employeeId: '',
    accessToken: '',
    client: '',
    uid: '',
    uuid: ''
  });

  const [showTokens, setShowTokens] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    try {
      const savedConfig = await invoke<string>('get_pontomais_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig) as PontoMaisConfig;
        setConfig(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleSave = async () => {
    if (!config.employeeId || !config.accessToken || !config.client || !config.uid || !config.uuid) {
      setTestResult({
        type: 'error',
        message: 'Todos os campos são obrigatórios!'
      });
      return;
    }

    setIsSaving(true);
    try {
      await invoke('save_pontomais_config', { config: JSON.stringify(config) });
      setTestResult({
        type: 'success',
        message: 'Configurações salvas com sucesso!'
      });
      setTimeout(() => {
        setTestResult({ type: null, message: '' });
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setTestResult({
        type: 'error',
        message: 'Erro ao salvar configurações!'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.employeeId || !config.accessToken || !config.client || !config.uid || !config.uuid) {
      setTestResult({
        type: 'error',
        message: 'Preencha todos os campos antes de testar!'
      });
      return;
    }

    setIsTesting(true);
    setTestResult({ type: null, message: '' });

    try {
      const response = await invoke<string>('test_pontomais_api', {
        config: JSON.stringify(config)
      });

      console.log('Resposta da API PontoMais:', response);

      setTestResult({
        type: 'success',
        message: 'Teste realizado com sucesso! Verifique o terminal para ver a resposta.'
      });
    } catch (error) {
      console.error('Erro no teste da API:', error);
      setTestResult({
        type: 'error',
        message: `Erro no teste: ${error}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleInputChange = (field: keyof PontoMaisConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    // Limpa mensagens de teste quando campos são alterados
    if (testResult.type) {
      setTestResult({ type: null, message: '' });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '600px'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div">
          Configurações da API PontoMais
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure os dados necessários para integração com a API do PontoMais.
                Estes dados são criptografados e armazenados localmente.
              </Typography>

              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  value={config.employeeId}
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                  variant="outlined"
                  size="small"
                  placeholder="Ex: 2522595"
                />

                <TextField
                  fullWidth
                  label="UID (Email)"
                  value={config.uid}
                  onChange={(e) => handleInputChange('uid', e.target.value)}
                  variant="outlined"
                  size="small"
                  placeholder="Ex: usuario@empresa.com.br"
                />

                <TextField
                  fullWidth
                  label="UUID"
                  value={config.uuid}
                  onChange={(e) => handleInputChange('uuid', e.target.value)}
                  variant="outlined"
                  size="small"
                  placeholder="Ex: 0b072508-c05a-495c-8290-ae5a06ccb498"
                />

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight={500}>
                    Tokens Sensíveis
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowTokens(!showTokens)}
                    aria-label="toggle password visibility"
                  >
                    {showTokens ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </Box>

                <TextField
                  fullWidth
                  label="Access Token"
                  type={showTokens ? 'text' : 'password'}
                  value={config.accessToken}
                  onChange={(e) => handleInputChange('accessToken', e.target.value)}
                  variant="outlined"
                  size="small"
                  placeholder="Ex: PKZ2pztj6LwOmflVYgIlxA"
                />

                <TextField
                  fullWidth
                  label="Client"
                  type={showTokens ? 'text' : 'password'}
                  value={config.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  variant="outlined"
                  size="small"
                  placeholder="Ex: W592qmPlHGWDX9ExycZeIA"
                />
              </Stack>
            </CardContent>
          </Card>

          {testResult.type && (
            <Alert severity={testResult.type}>
              {testResult.message}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={isTesting || isSaving}
          startIcon={<Science />}
          color="secondary"
        >
          {isTesting ? 'Testando...' : 'Testar API'}
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || isTesting}
          startIcon={<Save />}
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Settings;