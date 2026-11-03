package ar.edu.iua.iw3.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private static final String SECRETO = "clave-secreta-para-tests-unitarios-de-al-menos-32-bytes";
    private static final String OTRO_SECRETO = "otra-clave-secreta-diferente-de-al-menos-32-bytes-987";

    private final JwtService jwtService = new JwtService(SECRETO, 60);

    @Test
    void tokenValidoExtraeSubjectYRol() {
        String token = jwtService.generar("usuarioPrueba", "ADMIN");

        Optional<Claims> claimsOpt = jwtService.validar(token);

        assertTrue(claimsOpt.isPresent());
        assertEquals("usuarioPrueba", claimsOpt.get().getSubject());
        assertEquals("ADMIN", claimsOpt.get().get("rol", String.class));
    }

    @Test
    void tokenAlteradoFallaValidacion() {
        String token = jwtService.generar("usuarioPrueba", "TMS");
        String alterado = token.substring(0, token.length() - 5) + "XXXXX";

        Optional<Claims> claimsOpt = jwtService.validar(alterado);

        assertFalse(claimsOpt.isPresent());
    }

    @Test
    void tokenExpiradoFallaValidacion() {
        JwtService servicioExpirado = new JwtService(SECRETO, -5);
        String token = servicioExpirado.generar("usuarioPrueba", "OPERADOR");

        Optional<Claims> claimsOpt = jwtService.validar(token);

        assertFalse(claimsOpt.isPresent());
    }

    @Test
    void tokenFirmadoConOtraClaveFallaValidacion() {
        JwtService otroServicio = new JwtService(OTRO_SECRETO, 60);
        String tokenOtro = otroServicio.generar("usuarioPrueba", "SAP");

        Optional<Claims> claimsOpt = jwtService.validar(tokenOtro);

        assertFalse(claimsOpt.isPresent());
    }

    @Test
    void secretoMenorA32BytesLanzaExcepcion() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> new JwtService("secreto-corto-123", 60));
        assertTrue(ex.getMessage().contains("al menos 32 bytes"));
    }

    @Test
    void secretoNuloLanzaExcepcion() {
        assertThrows(IllegalStateException.class, () -> new JwtService(null, 60));
    }
}
