package ar.edu.iua.iw3.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ValidacionOrdenTest {

    private static final String BASE = "/api/v1/ordenes";

    @Autowired
    private MockMvc mvc;

    @Test
    void cisternasConMismoNumeroDa400() throws Exception {
        String payload = """
                {
                  "numeroOrden": 8001,
                  "camion": {
                    "codigoExterno": "CAM-REP",
                    "patente": "AA111AA",
                    "descripcion": "Camion con cisternas duplicadas",
                    "cisternas": [
                      {"numero": 1, "capacidadLitros": 5000},
                      {"numero": 1, "capacidadLitros": 5000}
                    ]
                  },
                  "chofer": {"codigoExterno": "CHO-REP", "nombre": "Juan", "apellido": "Perez"},
                  "cliente": {"codigoExterno": "CLI-REP", "razonSocial": "Cliente 1"},
                  "producto": {"codigoExterno": "PRO-REP", "nombre": "Propano"},
                  "fechaPrevistaCarga": "2026-11-10T08:00:00",
                  "preset": 10000.0
                }
                """;

        mvc.perform(post(BASE)
                .header(HttpHeaders.AUTHORIZATION, TestAuth.bearer(mvc, "sap"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detalles").isNotEmpty());
    }

    @Test
    void textoDe256CaracteresDa400() throws Exception {
        String texto256 = "A".repeat(256);
        String payload = """
                {
                  "numeroOrden": 8002,
                  "camion": {
                    "codigoExterno": "CAM-256",
                    "patente": "AA222AA",
                    "descripcion": "%s",
                    "cisternas": [{"numero": 1, "capacidadLitros": 10000}]
                  },
                  "chofer": {"codigoExterno": "CHO-256", "nombre": "%s", "apellido": "Perez"},
                  "cliente": {"codigoExterno": "CLI-256", "razonSocial": "Cliente 2"},
                  "producto": {"codigoExterno": "PRO-256", "nombre": "Propano"},
                  "fechaPrevistaCarga": "2026-11-10T08:00:00",
                  "preset": 10000.0
                }
                """.formatted(texto256, texto256);

        mvc.perform(post(BASE)
                .header(HttpHeaders.AUTHORIZATION, TestAuth.bearer(mvc, "sap"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void textoDe255CaracteresDa201() throws Exception {
        String texto255 = "B".repeat(255);
        String payload = """
                {
                  "numeroOrden": 8003,
                  "camion": {
                    "codigoExterno": "CAM-255",
                    "patente": "AA333AA",
                    "descripcion": "%s",
                    "cisternas": [{"numero": 1, "capacidadLitros": 10000}]
                  },
                  "chofer": {"codigoExterno": "CHO-255", "nombre": "%s", "apellido": "Perez"},
                  "cliente": {"codigoExterno": "CLI-255", "razonSocial": "%s"},
                  "producto": {"codigoExterno": "PRO-255", "nombre": "%s"},
                  "fechaPrevistaCarga": "2026-11-10T08:00:00",
                  "preset": 10000.0
                }
                """.formatted(texto255, texto255, texto255, texto255);

        mvc.perform(post(BASE)
                .header(HttpHeaders.AUTHORIZATION, TestAuth.bearer(mvc, "sap"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.numeroOrden").value(8003));
    }
}
