package ar.edu.iua.iw3.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.Optional;

/** Genera y valida los tokens JWT (firmados con HS256). */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    public static final String SECRETO_DESARROLLO = "clave-solo-para-desarrollo-cambiar-en-produccion-123456";
    private static final int MIN_BYTES_SECRETO = 32;

    private final SecretKey clave;
    private final Duration expiracion;

    public JwtService(@Value("${app.seguridad.jwt-secret}") String secreto,
                      @Value("${app.seguridad.jwt-expiracion-minutos:120}") long expiracionMinutos) {
        if (secreto == null || secreto.getBytes(StandardCharsets.UTF_8).length < MIN_BYTES_SECRETO) {
            throw new IllegalStateException(
                "El secreto JWT es demasiado corto. Debe tener al menos 32 bytes (256 bits) en UTF-8 para HS256. " +
                "Configure la variable de entorno JWT_SECRET (o la propiedad app.seguridad.jwt-secret) con una clave de al menos 32 caracteres."
            );
        }

        if (SECRETO_DESARROLLO.equals(secreto)) {
            log.warn("Se está utilizando el secreto JWT por defecto de desarrollo. " +
                     "Para entornos de producción, configure la variable de entorno JWT_SECRET con una clave propia y segura.");
        }

        // HS256 exige al menos 32 bytes
        this.clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        this.expiracion = Duration.ofMinutes(expiracionMinutos);
    }

    /** El token lleva usuario y rol, asi no se consulta la base en cada request. */
    public String generar(String username, String rol) {
        Date ahora = new Date();
        return Jwts.builder()
                .subject(username)
                .claim("rol", rol)
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + expiracion.toMillis()))
                .signWith(clave)
                .compact();
    }

    /** Devuelve los datos del token, o vacio si esta vencido, adulterado o mal formado. */
    public Optional<Claims> validar(String token) {
        try {
            return Optional.of(Jwts.parser().verifyWith(clave).build().parseSignedClaims(token).getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
