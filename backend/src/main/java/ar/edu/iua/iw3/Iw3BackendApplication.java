package ar.edu.iua.iw3;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
@EnableAsync // habilita @Async (el mail de la alarma se manda en otro hilo)
public class Iw3BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(Iw3BackendApplication.class, args);
	}

}
