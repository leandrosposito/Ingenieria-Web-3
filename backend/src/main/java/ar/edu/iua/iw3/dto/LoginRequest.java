package ar.edu.iua.iw3.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @Schema(example = "admin") @NotBlank @Size(max = 50) String username,
        @Schema(example = "demo1234") @NotBlank @Size(max = 72, message = "La contrasena no puede superar los 72 caracteres") String password) {
}
