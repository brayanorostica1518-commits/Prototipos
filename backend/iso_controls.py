"""
ISO 27001:2022 Controls Database
Anexo A - Controles de Seguridad de la Información
"""

ISO_27001_CONTROLS = {
    "A.5": {
        "name": "Controles Organizacionales",
        "controls": {
            "A.5.1": {
                "title": "Políticas de seguridad de la información",
                "description": "Políticas que definan la dirección y el apoyo de la gestión para la seguridad de la información",
                "objetivo": "Proporcionar dirección de la gestión y apoyo para la seguridad de la información"
            },
            "A.5.2": {
                "title": "Roles y responsabilidades de seguridad de la información",
                "description": "Roles y responsabilidades para la seguridad de la información definidos y asignados",
                "objetivo": "Asegurar que las responsabilidades de seguridad estén definidas y asignadas"
            },
            "A.5.3": {
                "title": "Segregación de funciones",
                "description": "Funciones conflictivas y áreas de responsabilidad segregadas",
                "objetivo": "Reducir las oportunidades para modificaciones no autorizadas o no intencionales"
            },
            "A.5.7": {
                "title": "Inteligencia de amenazas",
                "description": "Información sobre amenazas de seguridad recopilada y analizada",
                "objetivo": "Asegurar que la información sobre amenazas se use efectivamente"
            },
            "A.5.10": {
                "title": "Uso aceptable de la información",
                "description": "Reglas para el uso aceptable de información y activos",
                "objetivo": "Identificar, documentar e implementar reglas de uso aceptable"
            },
            "A.5.14": {
                "title": "Transferencia de información",
                "description": "Reglas, procedimientos o acuerdos para la transferencia de información",
                "objetivo": "Mantener la seguridad en la transferencia de información"
            }
        }
    },
    "A.6": {
        "name": "Controles de Personas",
        "controls": {
            "A.6.1": {
                "title": "Selección",
                "description": "Verificación de antecedentes en candidatos a empleados",
                "objetivo": "Asegurar que el personal y contratistas sean confiables y adecuados"
            },
            "A.6.2": {
                "title": "Términos y condiciones de empleo",
                "description": "Acuerdos contractuales que especifiquen responsabilidades de seguridad",
                "objetivo": "Asegurar que el personal entienda sus responsabilidades"
            },
            "A.6.3": {
                "title": "Concienciación, educación y capacitación en seguridad de la información",
                "description": "Personal capacitado y consciente de sus responsabilidades",
                "objetivo": "Asegurar que el personal esté consciente de las amenazas de seguridad"
            },
            "A.6.4": {
                "title": "Proceso disciplinario",
                "description": "Proceso formal para tomar acciones contra violaciones de seguridad",
                "objetivo": "Asegurar un enfoque consistente para violaciones de seguridad"
            },
            "A.6.5": {
                "title": "Responsabilidades después de la terminación o cambio de empleo",
                "description": "Responsabilidades de seguridad que continúan después del cambio o terminación",
                "objetivo": "Proteger los intereses de la organización en el proceso de cambio o terminación"
            }
        }
    },
    "A.7": {
        "name": "Controles Físicos",
        "controls": {
            "A.7.1": {
                "title": "Perímetros de seguridad física",
                "description": "Perímetros de seguridad definidos para proteger áreas con información sensible",
                "objetivo": "Prevenir acceso físico no autorizado"
            },
            "A.7.2": {
                "title": "Entrada física",
                "description": "Áreas seguras protegidas mediante controles de entrada apropiados",
                "objetivo": "Asegurar que solo personal autorizado acceda a áreas seguras"
            },
            "A.7.3": {
                "title": "Aseguramiento de oficinas, habitaciones e instalaciones",
                "description": "Seguridad física para oficinas, habitaciones e instalaciones",
                "objetivo": "Prevenir acceso físico no autorizado a información"
            },
            "A.7.4": {
                "title": "Monitoreo de seguridad física",
                "description": "Instalaciones monitoreadas continuamente contra acceso físico no autorizado",
                "objetivo": "Detectar y prevenir acceso físico no autorizado"
            },
            "A.7.7": {
                "title": "Escritorio y pantalla limpios",
                "description": "Reglas de escritorio limpio y pantalla limpia",
                "objetivo": "Reducir riesgos de acceso no autorizado o pérdida de información"
            },
            "A.7.10": {
                "title": "Medios de almacenamiento",
                "description": "Medios de almacenamiento gestionados de manera segura",
                "objetivo": "Prevenir divulgación, modificación o destrucción no autorizada"
            }
        }
    },
    "A.8": {
        "name": "Controles Tecnológicos",
        "controls": {
            "A.8.1": {
                "title": "Dispositivos de punto final del usuario",
                "description": "Información almacenada en dispositivos de punto final protegida",
                "objetivo": "Asegurar la protección de información en dispositivos de usuario"
            },
            "A.8.2": {
                "title": "Derechos de acceso privilegiados",
                "description": "Asignación y uso de derechos de acceso privilegiados restringidos",
                "objetivo": "Prevenir acceso no autorizado a sistemas e información"
            },
            "A.8.3": {
                "title": "Restricción de acceso a la información",
                "description": "Acceso a información y activos restringido según política de control de acceso",
                "objetivo": "Asegurar que el acceso esté autorizado y restringido"
            },
            "A.8.4": {
                "title": "Acceso al código fuente",
                "description": "Acceso de lectura y escritura al código fuente gestionado apropiadamente",
                "objetivo": "Prevenir cambios no autorizados al código fuente"
            },
            "A.8.5": {
                "title": "Autenticación segura",
                "description": "Tecnologías y procedimientos de autenticación segura implementados",
                "objetivo": "Asegurar identidades de usuarios autenticadas de manera segura"
            },
            "A.8.8": {
                "title": "Gestión de vulnerabilidades técnicas",
                "description": "Información sobre vulnerabilidades técnicas evaluada y se toman acciones",
                "objetivo": "Prevenir la explotación de vulnerabilidades técnicas"
            },
            "A.8.9": {
                "title": "Gestión de configuración",
                "description": "Configuraciones de seguridad de hardware, software, servicios y redes establecidas",
                "objetivo": "Asegurar configuraciones seguras de sistemas"
            },
            "A.8.10": {
                "title": "Eliminación de información",
                "description": "Información almacenada en sistemas de información eliminada de manera segura",
                "objetivo": "Prevenir divulgación no autorizada de información"
            },
            "A.8.11": {
                "title": "Enmascaramiento de datos",
                "description": "Enmascaramiento de datos usado según política de control de acceso",
                "objetivo": "Limitar la exposición de datos sensibles"
            },
            "A.8.12": {
                "title": "Prevención de fuga de datos",
                "description": "Medidas de prevención de fuga de datos aplicadas a sistemas",
                "objetivo": "Detectar y prevenir divulgación no autorizada de información"
            },
            "A.8.16": {
                "title": "Actividades de monitoreo",
                "description": "Redes, sistemas y aplicaciones monitoreadas para comportamiento anómalo",
                "objetivo": "Detectar comportamiento anómalo y posibles incidentes"
            },
            "A.8.23": {
                "title": "Filtrado web",
                "description": "Acceso a sitios web externos gestionado para reducir exposición",
                "objetivo": "Reducir exposición a contenido web malicioso"
            },
            "A.8.24": {
                "title": "Uso de criptografía",
                "description": "Reglas para el uso efectivo de criptografía definidas e implementadas",
                "objetivo": "Asegurar uso apropiado y efectivo de criptografía"
            }
        }
    },
    "A.5.CONTINUIDAD": {
        "name": "Continuidad del Negocio",
        "controls": {
            "A.5.29": {
                "title": "Seguridad de la información durante la interrupción",
                "description": "Planificación para mantener la seguridad durante interrupciones",
                "objetivo": "Asegurar disponibilidad de seguridad de la información durante interrupciones"
            },
            "A.5.30": {
                "title": "Preparación de TIC para la continuidad del negocio",
                "description": "Preparación de instalaciones de TIC para la continuidad del negocio",
                "objetivo": "Asegurar disponibilidad de instalaciones de TIC"
            }
        }
    },
    "A.5.CUMPLIMIENTO": {
        "name": "Cumplimiento y Legal",
        "controls": {
            "A.5.31": {
                "title": "Requisitos legales, estatutarios, reglamentarios y contractuales",
                "description": "Identificación y cumplimiento de requisitos de seguridad relevantes",
                "objetivo": "Evitar incumplimientos de obligaciones legales, estatutarias o contractuales"
            },
            "A.5.32": {
                "title": "Derechos de propiedad intelectual",
                "description": "Procedimientos para proteger derechos de propiedad intelectual",
                "objetivo": "Asegurar cumplimiento de requisitos legales de propiedad intelectual"
            },
            "A.5.33": {
                "title": "Protección de registros",
                "description": "Registros protegidos contra pérdida, destrucción, falsificación",
                "objetivo": "Asegurar que los registros se mantengan seguros"
            },
            "A.5.34": {
                "title": "Privacidad y protección de información de identificación personal (PII)",
                "description": "Privacidad y protección de PII aseguradas según requisitos",
                "objetivo": "Cumplir con requisitos de privacidad y protección de PII"
            },
            "A.5.36": {
                "title": "Cumplimiento de políticas, reglas y estándares para la seguridad de la información",
                "description": "Cumplimiento de políticas revisado regularmente",
                "objetivo": "Asegurar cumplimiento con políticas de seguridad"
            },
            "A.5.37": {
                "title": "Procedimientos operativos documentados",
                "description": "Procedimientos operativos documentados y disponibles",
                "objetivo": "Asegurar operación correcta y segura de instalaciones"
            }
        }
    }
}

ISO_9001_CONTROLS = {
    "4": {
        "name": "Contexto de la Organización",
        "controls": {
            "4.1": {
                "title": "Comprensión de la organización y su contexto",
                "description": "Determinación de cuestiones externas e internas relevantes",
                "objetivo": "Comprender factores que afectan el sistema de gestión de calidad"
            },
            "4.2": {
                "title": "Comprensión de las necesidades y expectativas de las partes interesadas",
                "description": "Determinar partes interesadas relevantes y sus requisitos",
                "objetivo": "Asegurar que se satisfacen las necesidades de partes interesadas"
            }
        }
    },
    "5": {
        "name": "Liderazgo",
        "controls": {
            "5.1": {
                "title": "Liderazgo y compromiso",
                "description": "Alta dirección demuestra liderazgo y compromiso con el SGC",
                "objetivo": "Asegurar efectividad del sistema de gestión de calidad"
            },
            "5.2": {
                "title": "Política de calidad",
                "description": "Establecimiento de política de calidad apropiada",
                "objetivo": "Proporcionar marco para establecer objetivos de calidad"
            }
        }
    },
    "8": {
        "name": "Operación",
        "controls": {
            "8.1": {
                "title": "Planificación y control operacional",
                "description": "Planificación, implementación y control de procesos",
                "objetivo": "Cumplir requisitos para provisión de productos y servicios"
            },
            "8.2": {
                "title": "Requisitos para productos y servicios",
                "description": "Comunicación con el cliente y determinación de requisitos",
                "objetivo": "Asegurar que requisitos del cliente sean comprendidos"
            },
            "8.5": {
                "title": "Producción y provisión del servicio",
                "description": "Control de producción y provisión del servicio",
                "objetivo": "Asegurar que producción y servicio cumplan requisitos"
            }
        }
    },
    "9": {
        "name": "Evaluación del Desempeño",
        "controls": {
            "9.1": {
                "title": "Seguimiento, medición, análisis y evaluación",
                "description": "Determinar qué necesita seguimiento y medición",
                "objetivo": "Asegurar conformidad y efectividad del SGC"
            },
            "9.2": {
                "title": "Auditoría interna",
                "description": "Realizar auditorías internas a intervalos planificados",
                "objetivo": "Proporcionar información sobre conformidad y efectividad"
            }
        }
    },
    "10": {
        "name": "Mejora",
        "controls": {
            "10.1": {
                "title": "Generalidades",
                "description": "Determinar y seleccionar oportunidades de mejora",
                "objetivo": "Mejorar continuamente la satisfacción del cliente"
            },
            "10.2": {
                "title": "No conformidad y acción correctiva",
                "description": "Reaccionar ante no conformidades y tomar acciones correctivas",
                "objetivo": "Eliminar causas de no conformidades"
            }
        }
    }
}


def get_framework_controls(framework_name: str) -> dict:
    """
    Get controls for a specific framework
    
    Args:
        framework_name: Name of the framework (e.g., 'ISO 27001', 'ISO 9001')
    
    Returns:
        Dictionary of controls for the framework
    """
    framework_map = {
        'ISO 27001': ISO_27001_CONTROLS,
        'ISO 9001': ISO_9001_CONTROLS,
    }
    
    return framework_map.get(framework_name, {})


def format_controls_for_prompt(framework_name: str) -> str:
    """
    Format controls into a string for AI prompt
    
    Args:
        framework_name: Name of the framework
    
    Returns:
        Formatted string with controls information
    """
    controls = get_framework_controls(framework_name)
    
    if not controls:
        return ""
    
    output = f"\n\n=== CONTROLES DE {framework_name.upper()} ===\n\n"
    
    for section_key, section_data in controls.items():
        output += f"\n{section_key} - {section_data['name']}:\n"
        
        for control_key, control_data in section_data['controls'].items():
            output += f"\n  • {control_key}: {control_data['title']}\n"
            output += f"    - Descripción: {control_data['description']}\n"
            output += f"    - Objetivo: {control_data['objetivo']}\n"
    
    return output


def get_all_framework_controls_for_prompt(frameworks: list) -> str:
    """
    Get formatted controls for multiple frameworks
    
    Args:
        frameworks: List of framework names
    
    Returns:
        Combined formatted string with all controls
    """
    output = ""
    
    for framework in frameworks:
        if framework in ['ISO 27001', 'ISO 9001']:
            output += format_controls_for_prompt(framework)
    
    if output:
        output = "\n\n" + "="*80 + "\nINFORMACIÓN DE CONTROLES ESPECÍFICOS\n" + "="*80 + output
        output += "\n\n" + "="*80 + "\n"
        output += "INSTRUCCIONES IMPORTANTES:\n"
        output += "- Las recomendaciones DEBEN hacer referencia específica a estos controles\n"
        output += "- Cada GAP debe indicar qué control(es) específico(s) está(n) afectado(s)\n"
        output += "- Las acciones correctivas deben alinearse con los objetivos de los controles\n"
        output += "="*80 + "\n\n"
    
    return output
