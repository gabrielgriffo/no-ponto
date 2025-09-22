import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Slide,
  IconButton
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { Work, Schedule, Close, Error } from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

interface CustomNotificationProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

const CustomNotification: React.FC<CustomNotificationProps> = ({
  open,
  onClose,
  title,
  message,
  type
}) => {

  useEffect(() => {
    if (open) {
      // Create and play notification sound using Web Audio API
      
      // Use a notification sound data URL (simplified notification tone)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = type === 'success' ? 800 : 600;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Play a second tone for success
      if (type === 'success') {
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          
          oscillator2.frequency.value = 1000;
          oscillator2.type = 'sine';
          
          gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 0.5);
        }, 200);
      }

      // Auto-close after 10 seconds if not dismissed
      const timer = setTimeout(() => {
        onClose();
      }, 10000);

      return () => {
        clearTimeout(timer);
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      };
    }
  }, [open, type, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Work sx={{ fontSize: 40, color: '#4caf50' }} />;
      case 'warning':
        return <Schedule sx={{ fontSize: 40, color: '#ff9800' }} />;
      case 'error':
        return <Error sx={{ fontSize: 40, color: '#f44336' }} />;
      default:
        return <Schedule sx={{ fontSize: 40, color: '#2196f3' }} />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#2196f3';
    }
  };

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      aria-describedby="notification-dialog"
      PaperProps={{
        sx: {
          borderTop: `4px solid ${getColor()}`,
          minWidth: 400,
          maxWidth: 500
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <Avatar sx={{ bgcolor: getColor(), mr: 2, width: 56, height: 56 }}>
          {getIcon()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            NoPonto - Controle de Ponto
          </Typography>
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'grey.500' }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" sx={{ py: 2 }}>
          {message}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{ bgcolor: getColor(), '&:hover': { bgcolor: getColor(), opacity: 0.9 } }}
          fullWidth
        >
          OK, Entendi!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomNotification;