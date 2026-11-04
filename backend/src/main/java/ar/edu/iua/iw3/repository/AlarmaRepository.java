package ar.edu.iua.iw3.repository;

import ar.edu.iua.iw3.model.Alarma;
import ar.edu.iua.iw3.model.EstadoAlarma;
import ar.edu.iua.iw3.model.Orden;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AlarmaRepository extends JpaRepository<Alarma, Long> {

    /** Sirve para no volver a alarmar una orden que ya tiene una alarma sin aceptar. */
    boolean existsByOrdenAndEstado(Orden orden, EstadoAlarma estado);

    List<Alarma> findAllByOrderByFechaHoraDesc();

    List<Alarma> findByEstadoOrderByFechaHoraDesc(EstadoAlarma estado);

    /**
     * Busca la alarma y la bloquea con SELECT ... FOR UPDATE.
     * Si dos transacciones intentan aceptar la misma alarma al mismo tiempo,
     * la segunda se bloquea hasta que la primera termine (commit o rollback).
     * Si la primera confirma la aceptacion, el servicio rechaza la segunda con 409.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Alarma a WHERE a.id = :id")
    Optional<Alarma> findByIdParaAceptar(@Param("id") Long id);
}
