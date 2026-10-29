package ar.edu.iua.iw3.controller;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Alarma de temperatura (umbral 40 en los tests): un solo mail hasta que alguien la acepta. */
@SpringBootTest
@AutoConfigureMockMvc
class AlarmasTest {

    private static final String ALARMAS = "/api/v1/alarmas";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private JavaMailSender mailSender;

    @Test
    void sinSuperarElUmbralNoHayAlarmaNiMail() throws Exception {
        reset(mailSender);
        TestAuth.ordenEnCarga(mvc, 8001, "ALA001", 10000);

        TestAuth.dato(mvc, 8001, 1000, 40, 3000).andExpect(status().isOk()); // 40 no supera 40

        verify(mailSender, after(300).never()).send(any(SimpleMailMessage.class));
        TestAuth.get(mvc, "operador", ALARMAS).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.numeroOrden==8001)]").isEmpty());
    }

    @Test
    void superarElUmbralMandaUnSoloMailHastaQueSeAcepta() throws Exception {
        reset(mailSender);
        TestAuth.ordenEnCarga(mvc, 8002, "ALA002", 10000);

        // 1. Primer dato sobre el umbral: alarma pendiente + 1 mail a los dos destinatarios
        TestAuth.dato(mvc, 8002, 1000, 45.5, 3000).andExpect(jsonPath("$.aceptado").value(true));
        ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, timeout(2000).times(1)).send(mail.capture()); // el mail sale en otro hilo (@Async)
        assertArrayEquals(new String[]{"uno@test.local", "dos@test.local"}, mail.getValue().getTo());
        assertTrue(mail.getValue().getText().contains("8002"));

        // 2. Mas datos sobre el umbral: no hay otra alarma ni otro mail
        TestAuth.dato(mvc, 8002, 2000, 50, 3000);
        TestAuth.dato(mvc, 8002, 3000, 55, 3000);
        verify(mailSender, after(300).times(1)).send(any(SimpleMailMessage.class));

        String pendientes = TestAuth.get(mvc, "operador", ALARMAS + "?estado=PENDIENTE")
                .andExpect(jsonPath("$[?(@.numeroOrden==8002)]", hasSize(1)))
                .andReturn().getResponse().getContentAsString();
        int id = ((java.util.List<Integer>) JsonPath.read(pendientes, "$[?(@.numeroOrden==8002)].id")).get(0);

        // 3. Un rol sin permiso no puede aceptarla
        TestAuth.post(mvc, "tms", ALARMAS + "/" + id + "/aceptar", "{}").andExpect(status().isForbidden());

        // 4. El operador la acepta: queda registrado quien, cuando y la observacion
        TestAuth.post(mvc, "operador", ALARMAS + "/" + id + "/aceptar", "{\"observacion\":\"Se reviso el camion\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ACEPTADA"))
                .andExpect(jsonPath("$.usuarioAceptacion").value("operador"))
                .andExpect(jsonPath("$.fechaAceptacion").isNotEmpty())
                .andExpect(jsonPath("$.observacion").value("Se reviso el camion"));

        // 5. Aceptarla otra vez da 409; una inexistente, 404
        TestAuth.post(mvc, "operador", ALARMAS + "/" + id + "/aceptar", "{}").andExpect(status().isConflict());
        TestAuth.post(mvc, "operador", ALARMAS + "/999999/aceptar", "{}").andExpect(status().isNotFound());

        // 6. Despues de aceptada, un nuevo dato sobre el umbral vuelve a alarmar (2do mail)
        TestAuth.dato(mvc, 8002, 4000, 60, 3000);
        verify(mailSender, timeout(2000).times(2)).send(any(SimpleMailMessage.class));
        TestAuth.get(mvc, "operador", ALARMAS + "?estado=PENDIENTE")
                .andExpect(jsonPath("$[?(@.numeroOrden==8002)]", hasSize(1)));
    }

    @Test
    void siFallaElMailLaAlarmaIgualQuedaGuardadaYElDatoSeAcepta() throws Exception {
        reset(mailSender);
        doThrow(new MailSendException("SMTP caido")).when(mailSender).send(any(SimpleMailMessage.class));
        TestAuth.ordenEnCarga(mvc, 8003, "ALA003", 10000);

        TestAuth.dato(mvc, 8003, 1000, 70, 3000)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aceptado").value(true));

        TestAuth.get(mvc, "operador", ALARMAS + "?estado=PENDIENTE")
                .andExpect(jsonPath("$[?(@.numeroOrden==8003)]", hasSize(1)));
    }

    @Test
    void unDatoDescartadoNoGeneraAlarma() throws Exception {
        reset(mailSender);
        TestAuth.ordenEnCarga(mvc, 8004, "ALA004", 10000);

        // caudal 0: se descarta aunque la temperatura sea altisima
        TestAuth.dato(mvc, 8004, 1000, 90, 0).andExpect(jsonPath("$.aceptado").value(false));

        verify(mailSender, after(300).never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void elMailNoDemoraLaRespuestaDelDato() throws Exception {
        reset(mailSender);
        CountDownLatch mailEnviado = new CountDownLatch(1);
        doAnswer(inv -> {
            Thread.sleep(1500); // SMTP lento
            mailEnviado.countDown();
            return null;
        }).when(mailSender).send(any(SimpleMailMessage.class));
        TestAuth.ordenEnCarga(mvc, 8005, "ALA005", 10000);

        long inicio = System.nanoTime();
        TestAuth.dato(mvc, 8005, 1000, 80, 3000).andExpect(jsonPath("$.aceptado").value(true));
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        assertTrue(ms < 1000, "el dato tardo " + ms + " ms: estaria esperando al mail");
        assertTrue(mailEnviado.await(5, TimeUnit.SECONDS), "el mail igual tiene que salir");
    }

    @Test
    void dosAceptacionesConcurrentesDan200Y409ConservandoElPrimerOperador() throws Exception {
        reset(mailSender);
        TestAuth.ordenEnCarga(mvc, 8006, "ALA006", 10000);
        TestAuth.dato(mvc, 8006, 1000, 75, 3000).andExpect(jsonPath("$.aceptado").value(true));

        // Obtenemos el id de la alarma pendiente
        String pendientes = TestAuth.get(mvc, "operador", ALARMAS + "?estado=PENDIENTE")
                .andExpect(jsonPath("$[?(@.numeroOrden==8006)]", hasSize(1)))
                .andReturn().getResponse().getContentAsString();
        int id = ((java.util.List<Integer>) JsonPath.read(pendientes, "$[?(@.numeroOrden==8006)].id")).get(0);

        // Dos hilos intentan aceptar la misma alarma al mismo tiempo.
        // El lock pesimista garantiza que solo uno la acepta: el segundo recibe 409.
        CountDownLatch listos = new CountDownLatch(2);   // sincroniza el arranque
        CountDownLatch terminados = new CountDownLatch(2);
        AtomicInteger respuesta200 = new AtomicInteger(0);
        AtomicInteger respuesta409 = new AtomicInteger(0);

        String url = ALARMAS + "/" + id + "/aceptar";
        Runnable aceptar = () -> {
            try {
                listos.countDown();
                listos.await(5, TimeUnit.SECONDS); // los dos hilos arrancan juntos
                int estado = TestAuth.post(mvc, "operador", url, "{}")
                        .andReturn().getResponse().getStatus();
                if (estado == 200) respuesta200.incrementAndGet();
                if (estado == 409) respuesta409.incrementAndGet();
            } catch (Exception e) {
                throw new RuntimeException(e);
            } finally {
                terminados.countDown();
            }
        };

        Thread t1 = new Thread(aceptar, "operador-1");
        Thread t2 = new Thread(aceptar, "operador-2");
        t1.start();
        t2.start();
        assertTrue(terminados.await(10, TimeUnit.SECONDS), "los hilos no terminaron a tiempo");

        // Exactamente uno recibe 200 y el otro 409
        assertEquals(1, respuesta200.get(), "exactamente un operador debio recibir 200");
        assertEquals(1, respuesta409.get(), "el segundo operador debio recibir 409");

        // El campo usuarioAceptacion queda con "operador" (el unico usuario de prueba que la acepto)
        // y el estado es ACEPTADA: el segundo intento no piso los datos del primero.
        String aceptadas = TestAuth.get(mvc, "operador", ALARMAS + "?estado=ACEPTADA")
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String usuario = ((java.util.List<String>) JsonPath.read(aceptadas, "$[?(@.numeroOrden==8006)].usuarioAceptacion")).get(0);
        assertEquals("operador", usuario, "el usuarioAceptacion no debio pisarse");
    }
}
