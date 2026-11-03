package ar.edu.iua.iw3.dto;

import ar.edu.iua.iw3.model.ConfiguracionAlarma;
import ar.edu.iua.iw3.service.ConfiguracionAlarmaService;

import java.time.LocalDateTime;
import java.util.List;

public record ConfiguracionAlarmaResponse(
        double temperaturaUmbral,
        List<String> destinatarios,
        String actualizadoPor,
        LocalDateTime fechaActualizacion) {

    public static ConfiguracionAlarmaResponse desde(ConfiguracionAlarma c) {
        return new ConfiguracionAlarmaResponse(c.getTemperaturaUmbral(),
                ConfiguracionAlarmaService.parsearDestinatarios(c.getDestinatarios()), c.getActualizadoPor(), c.getFechaActualizacion());
    }
}
