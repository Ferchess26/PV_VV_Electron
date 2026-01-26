window.CalendarModule = {
    calendar: null,
    modalMainInstance: null,
    modalFormInstance: null,
    editingId: null,
    currentUserId: null,

    init: async function () {
        this.modalMainInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById("calendarModal"));
        this.modalFormInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById("calendarFormModal"), { backdrop: 'static' });

        await this.syncUser();
        this.initEvents();
        this.initClientSearch();
    },

    showToast: async function (msg, type = 'error') {
        try {
            const fileName = type === 'success' ? 'alert_success.html' : 'alert_error.html';
            const response = await fetch(`../../helpers/${fileName}`);
            const alertHtml = await response.text();

            const alertWrapper = document.createElement('div');
            alertWrapper.innerHTML = alertHtml;
            const alertElement = alertWrapper.querySelector('.alert');

            if (type === 'success') {
                alertElement.classList.remove('alert-secondary');
                alertElement.classList.add('alert-success');
            }

            Object.assign(alertElement.style, {
                zIndex: "11000",
                position: "fixed",
                bottom: "10px",
                left: "30px",
                right: "auto",
                minWidth: "280px",
                margin: "0",
                boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
                opacity: "0",
                transition: "all 0.4s ease-in-out",
                transform: "translateY(20px)"
            });

            const textNode = alertElement.querySelector('span') || alertElement;
            textNode.textContent = msg;

            document.body.appendChild(alertElement);

            setTimeout(() => {
                alertElement.style.opacity = "1";
                alertElement.style.bottom = "30px";
                alertElement.style.transform = "translateY(0)";
            }, 50);

            setTimeout(() => {
                alertElement.style.opacity = "0";
                alertElement.style.transform = "translateY(-10px)";
                setTimeout(() => alertElement.remove(), 400);
            }, 1800);

        } catch (e) {
            console.error("Error al cargar el Toast:", e);
        }
    },

    initEvents: function () {
        document.getElementById("btn-quick-event")?.addEventListener("click", () => {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            let hour = now.getHours() + 1;
            if (hour > 23) hour = 23;
            const time = `${String(hour).padStart(2, '0')}:00`;
            this.openForm(date, time);
        });

        document.getElementById("btn-save-calendar")?.addEventListener("click", () => this.save());
        document.getElementById("btn-add-type")?.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("new-type-form").classList.toggle("d-none");
        });
        document.getElementById("btn-save-new-type")?.addEventListener("click", () => this.saveNewType());

        document.getElementById("cal-start-time")?.addEventListener("change", () => this.fillEndTimes());
        document.getElementById("cal-date")?.addEventListener("change", () => this.fillStartTimes());

        document.getElementById("calendarModal").addEventListener("shown.bs.modal", () => {
            if (!this.calendar) {
                this.renderCalendar();
            } else {
                this.calendar.updateSize();
                const nowHour = new Date().getHours();
                this.calendar.scrollToTime(`${String(nowHour).padStart(2, '0')}:00:00`);
                this.calendar.refetchEvents();
            }
            this.loadDayEvents(new Date().toISOString().split('T')[0]);
            this.loadAppointmentTypes();
        });
    },

    renderCalendar: function () {
        const currentHour = new Date().getHours();
        const scrollStartTime = `${String(currentHour).padStart(2, '0')}:00:00`;

        this.calendar = new FullCalendar.Calendar(document.getElementById("calendar-view"), {
            locale: "es",
            initialView: "timeGridWeek",
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
            height: "100%",
            expandRows: true,
            editable: true,
            selectable: true,
            allDaySlot: false,
            nowIndicator: true,
            scrollTime: scrollStartTime,
            scrollTimeReset: false,
            slotDuration: '00:15:00',
            slotLabelInterval: '01:00:00',
            snapDuration: '00:15:00',
            dayHeaderFormat: { weekday: 'short', day: 'numeric', omitCommas: true },
            selectAllow: (info) => info.start >= new Date().setMinutes(new Date().getMinutes() - 5),
            navLinks: true,
            navLinkDayClick: (date) => this.loadDayEvents(date.toISOString().split('T')[0]),
            select: (info) => this.openForm(info.startStr.split("T")[0], info.startStr.substring(11, 16)),
            eventClick: (info) => this.loadEventToEdit(info.event.id),
            events: async (fetchInfo, successCallback) => {
                try {
                    const rows = await window.electronAPI.invoke("calendar:list");
                    const mappedEvents = (rows || []).map(r => ({
                        id: String(r.id),
                        title: `${r.titulo} - ${r.nombre_cliente} `,
                        start: r.fecha_inicio,
                        end: r.fecha_fin,
                        className: r.estatus === 0 ? 'event-cancelled' : '',
                        backgroundColor: r.estatus === 0 ? '#dc3545' : (r.tColor || '#1A365D'),
                        borderColor: 'white'
                    }));
                    successCallback(mappedEvents);
                } catch (error) {}
            },
            eventDrop: async (info) => {
                if (info.event.start < new Date()) {
                    this.showToast("No puedes mover citas al pasado.", "error");
                    info.revert();
                    return;
                }
                await this.updateEventTimes(info.event);
            },
            eventResize: async (info) => {
                await this.updateEventTimes(info.event);
            }
        });
        this.calendar.render();
    },

    fillStartTimes: function (selectedTime = null) {
        const sel = document.getElementById("cal-start-time");
        const dateVal = document.getElementById("cal-date").value;
        const now = new Date();
        const isToday = dateVal === now.toISOString().split('T')[0];
        sel.innerHTML = "";
        for (let h = 0; h <= 23; h++) {
            for (let m = 0; m < 60; m += 15) {
                const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                if (isToday) {
                    const optTime = new Date(`${dateVal}T${t}:00`);
                    if (optTime < now && t !== selectedTime) continue;
                }
                sel.insertAdjacentHTML("beforeend", `<option value="${t}" ${t === selectedTime ? 'selected' : ''}>${t}</option>`);
            }
        }
        this.fillEndTimes();
    },

    fillEndTimes: function (selectedEnd = null) {
        const start = document.getElementById("cal-start-time").value;
        const sel = document.getElementById("cal-end-time");
        if (!start) return;
        const [hS, mS] = start.split(":").map(Number);
        sel.innerHTML = "";
        for (let h = hS; h <= 23; h++) {
            for (let m = 0; m < 60; m += 15) {
                if (h > hS || (h === hS && m > mS)) {
                    const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                    sel.insertAdjacentHTML("beforeend", `<option value="${t}" ${t === selectedEnd ? 'selected' : ''}>${t}</option>`);
                }
            }
        }
    },

    openForm: function (date, time) {
        if (new Date(`${date}T${time}`) < new Date(new Date().getTime() - 60000)) {
            this.showToast("No puedes agendar en el pasado.", "error");
            return;
        }
        this.editingId = null;
        document.getElementById("cal-date").value = date;
        document.getElementById("cal-client-id").value = "";
        document.getElementById("cal-client-search").value = "";
        document.getElementById("cal-phone").value = "";
        document.getElementById("cal-notes").value = "";
        document.getElementById("cal-status-switch").checked = true;
        this.fillStartTimes(time);
        this.modalFormInstance.show();
    },

    loadDayEvents: async function (dateStr) {
        const rows = await window.electronAPI.invoke("calendar:get-day", dateStr);
        document.getElementById("current-day-label").textContent = dateStr;
        const list = document.getElementById("day-events-list");
        list.innerHTML = rows.map(r => {
            const color = r.estatus === 0 ? '#dc3545' : (r.color || '#1A365D');
            return `<li class="list-group-item" style="border-left-color: ${color} !important" onclick="CalendarModule.loadEventToEdit(${r.id})">
                <div class="fw-bold ${r.estatus === 0 ? 'event-cancelled' : ''}">${r.nombre_cliente}</div>
                <div class="small text-muted">${r.titulo} | ${r.fecha_inicio.substring(11, 16)} hs</div>
            </li>`;
        }).join('') || '<li class="list-group-item text-muted text-center border-0">Sin citas</li>';
    },

    save: async function () {
        const nombreCliente = document.getElementById("cal-client-search").value.trim();
        const fecha = document.getElementById("cal-date").value;
        const tipoCitaSelect = document.getElementById("cal-type-id");
        const nombreTipoCita = tipoCitaSelect.options[tipoCitaSelect.selectedIndex]?.text || "Cita";

        if (!nombreCliente || !fecha) {
            this.showToast("Nombre y Fecha son obligatorios.", "error");
            return;
        }

        const calendarData = {
            id: this.editingId,
            id_cliente: document.getElementById("cal-client-id").value ? parseInt(document.getElementById("cal-client-id").value) : null,
            id_tipo_cita: parseInt(tipoCitaSelect.value),
            nombre_cliente: nombreCliente,
            titulo: nombreTipoCita,
            observaciones: document.getElementById("cal-notes").value,
            telefono_contacto: document.getElementById("cal-phone").value,
            usuario_creador: parseInt(this.currentUserId || 1),
            fecha_inicio: `${fecha}T${document.getElementById("cal-start-time").value}:00`,
            fecha_fin: `${fecha}T${document.getElementById("cal-end-time").value}:00`,
            estatus: document.getElementById("cal-status-switch").checked ? 1 : 0
        };

        try {
            await window.electronAPI.invoke("calendar:save", calendarData);
            this.modalFormInstance.hide();
            this.calendar.refetchEvents();
            this.loadDayEvents(fecha);
            this.showToast("¡Evento guardado con éxito!", "success");
        } catch (e) {
            this.showToast("Error al procesar la solicitud.");
        }
    },

    updateEventTimes: async function (event) {
        try {
            await window.electronAPI.invoke("calendar:update-times", {
                id: event.id,
                start: event.startStr.substring(0, 19),
                end: (event.endStr || event.startStr).substring(0, 19)
            });
            this.loadDayEvents(event.startStr.split('T')[0]);
            this.showToast("Tiempo actualizado correctamente.", "success");
        } catch (e) {
            this.showToast("Error al actualizar horarios.");
        }
    },

    loadAppointmentTypes: async function (selectedId = null) {
        const select = document.getElementById("cal-type-id");
        const rows = await window.electronAPI.invoke("calendar:get-types");

        select.innerHTML = rows.map(t => {
            const isSelected = t.id == selectedId ? 'selected' : '';
            return `<option value="${t.id}" ${isSelected} data-color="${t.color}" style="background-color: ${t.color}; color: white;">${t.nombre}</option>`;
        }).join('');

        const updateSelectColor = () => {
            const selectedOpt = select.options[select.selectedIndex];
            if (selectedOpt) {
                select.style.backgroundColor = selectedOpt.dataset.color;
                select.style.color = 'white';
            }
        };
        select.onchange = updateSelectColor;
        updateSelectColor();
    },

    saveNewType: async function () {
        const nombre = document.getElementById("new-type-name").value.trim();
        const color = document.getElementById("new-type-color").value;
        if (!nombre) return;
        
        try {
            await window.electronAPI.invoke("calendar:save-type", { nombre, color });
            document.getElementById("new-type-form").classList.add("d-none");
            document.getElementById("new-type-name").value = "";
            this.loadAppointmentTypes();
            this.showToast("Tipo de cita añadido.", "success");
        } catch (e) {
            this.showToast("Error al guardar tipo de cita.");
        }
    },

    initClientSearch: function () {
        const input = document.getElementById("cal-client-search");
        const list = document.getElementById("client-results");

        input?.addEventListener("input", async () => {
            const q = input.value.trim();
            if (q === "") document.getElementById("cal-client-id").value = "";
            if (q.length < 1) return list.classList.add("d-none");

            try {
                const rows = await window.electronAPI.invoke("clients:search", q);
                if (rows.length === 0) {
                    list.innerHTML = `<li class="list-group-item small text-muted">No se encontraron coincidencias</li>`;
                } else {
                    list.innerHTML = rows.map(c => {
                        const full = `${c.nombre} ${c.apellido_paterno} ${c.apellido_materno || ''}`.trim();
                        return `<li class="list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center" 
                                style="cursor:pointer"
                                onclick="CalendarModule.selectClient(${c.id}, '${full}', '${c.telefono || ''}')">
                                <div>
                                    <div class="fw-bold" style="font-size: 0.85rem;">${full}</div>
                                    <small class="text-muted">${c.rfc || 'Sin RFC'}</small>
                                </div>
                                <span class="badge bg-light text-dark border"><i class="fas fa-phone me-1"></i>${c.telefono || 'N/A'}</span>
                            </li>`;
                    }).join('');
                }
                list.classList.remove("d-none");
            } catch (e) {}
        });

        document.addEventListener("click", (e) => {
            if (!input.contains(e.target) && !list.contains(e.target)) list.classList.add("d-none");
        });
    },

    selectClient: function (id, name, phone) {
        document.getElementById("cal-client-id").value = id;
        document.getElementById("cal-client-search").value = name;
        document.getElementById("cal-phone").value = phone;
        document.getElementById("client-results").classList.add("d-none");
    },

    syncUser: async function () {
        const session = await window.electronAPI.invoke("get-user-session");
        this.currentUserId = session ? parseInt(session.id) : 1;
    },

    loadEventToEdit: async function (id) {
        const rows = await window.electronAPI.invoke("calendar:list");
        const ev = rows.find(x => x.id == id);

        if (ev) {
            this.editingId = ev.id;
            document.getElementById("cal-client-id").value = ev.id_cliente || "";
            document.getElementById("cal-client-search").value = ev.nombre_cliente;
            document.getElementById("cal-phone").value = ev.telefono_contacto || "";
            document.getElementById("cal-notes").value = ev.observaciones || "";
            document.getElementById("cal-date").value = ev.fecha_inicio.split("T")[0];
            document.getElementById("cal-status-switch").checked = ev.estatus === 1;
            await this.loadAppointmentTypes(ev.id_tipo_cita);
            this.fillStartTimes(ev.fecha_inicio.substring(11, 16));
            this.fillEndTimes(ev.fecha_fin.substring(11, 16));
            this.modalFormInstance.show();
        }
    }
};

CalendarModule.init();