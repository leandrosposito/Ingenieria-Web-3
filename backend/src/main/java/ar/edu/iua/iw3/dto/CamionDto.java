package ar.edu.iua.iw3.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Camion tal como lo manda SAP. */
public record CamionDto(
        @Schema(example = "CAM-001") @NotBlank @Size(max = 50) String codigoExterno,
        @Schema(example = "AB123CD") @NotBlank @Size(max = 20) String patente,
        @Schema(example = "Scania cisterna doble") @Size(max = 255) String descripcion,
        @NotEmpty List<@Valid CisternaDto> cisternas) {

    @AssertTrue(message = "No puede haber cisternas con el mismo numero")
    public boolean isCisternasValidas() {
        if (cisternas == null || cisternas.isEmpty()) {
            return true;
        }
        long distintas = cisternas.stream()
                .filter(c -> c != null && c.numero() != null)
                .map(CisternaDto::numero)
                .distinct()
                .count();
        long totalValidas = cisternas.stream()
                .filter(c -> c != null && c.numero() != null)
                .count();
        return distintas == totalValidas;
    }
}
