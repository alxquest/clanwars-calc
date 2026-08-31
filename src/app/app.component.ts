import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Classes,
  attributesFor,
  expToLevel,
  levelToExp,
  getWeaponValue,
  maxingBless,
  maxingGear,
  calculateAttributeMod,
  minimumStealthToAvoidDetection,
  Professions,
  ProfessionRow,
  StatRow,
  Stats,
  ptmBase,
  totalExp
} from './stat-calculator';

interface WarcryOptimizationProgress {
  exploredCount: number;
  highestLevelSeen: number;
  bestWarcry: number;
  bestBuildLevel: number;
  limitReached?: boolean;
}

type OptimizationMetric = 'offense' | 'defense' | 'immunity' | 'freeze' | 'lightning' | 'fire' | 'warcry';

interface OptimizationWeight {
  key: OptimizationMetric;
  label: string;
  weight: number;
}

interface OptimizationProgress {
  exploredCount: number;
  highestLevelSeen: number;
  bestScore: number;
  bestBuildLevel: number;
}

interface OptimizationRequest {
  targetLevel: number;
  weights: Record<OptimizationMetric, number>;
  reservePercent: number;
  minRequirement?: { metric: OptimizationMetric; value: number };
  maxWarcry?: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})

export class AppComponent implements OnInit {
  title = 'statcalc';
  Stats = Stats;

  builds: Build[] = [

  ];
  isDeleteModalOpen = false;
  isManageHiddenRowsModalOpen = false;
  buildToDelete: Build | null = null;
  isDarkMode = false;
  copyConfirmation = '';

  constructor() {
  }

  ngOnInit(): void {
    this.loadBuilds(); // Load builds from localStorage when the component initializes
    this.loadThemePreference();
    this.buildSpeedBreaksTable();
    this.tryLoadBuildFromQuery();
    if (this.builds.length == 0) {
      this.addNewBuild();
    }
  }

  loadThemePreference(): void {
    const storedTheme = localStorage.getItem('preferredTheme');
    this.isDarkMode = storedTheme === 'dark';
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('preferredTheme', this.isDarkMode ? 'dark' : 'light');
  }

  loadBuilds(): void {
    const savedBuilds = localStorage.getItem('builds');
    if (savedBuilds) {
      const parsedBuilds = JSON.parse(savedBuilds);
      this.builds = [];
      parsedBuilds.forEach((parsedBuild: Build) => {

        const savedBuild = new Build();

        savedBuild.id = parsedBuild.id;
        savedBuild.name = parsedBuild.name;
        
        savedBuild.selectedClass = parsedBuild.selectedClass;
        savedBuild.blessed = parsedBuild.blessed;
        savedBuild.maxingBless = parsedBuild.maxingBless;
        savedBuild.hardcore = parsedBuild.hardcore;
        savedBuild.maxingEquipment = parsedBuild.maxingEquipment;
        savedBuild.unarched = parsedBuild.unarched ?? false;
        savedBuild.thiefMode = parsedBuild.thiefMode ?? false;
        savedBuild.tacticsActive = parsedBuild.tacticsActive ?? true;
        savedBuild.rageActive = parsedBuild.rageActive ?? true;
        savedBuild.speedMode = parsedBuild.speedMode ?? savedBuild.speedMode;

        savedBuild.statRows = parsedBuild.statRows;
        savedBuild.profRows = parsedBuild.profRows;

        savedBuild.calculateAllXp();

        this.builds.push(savedBuild);
      });

      if (this.builds.length > 0) {
        this.selectedBuild = this.builds[this.builds.length-1];
      }
    }
  }

  saveBuilds(): void {
    localStorage.setItem('builds', JSON.stringify(this.builds));
  }

  selectedBuildType: string = 'buildType1'; // Default build type
  selectedBuild : Build = new Build()
  isLoadModalOpen: boolean = false;
  showStealthAndPercTables = true;
  showSpeedBreaksTable = true;
  isMobileMenuOpen = false;
  warcryTargetLevel = 20;
  warcryOptimizationNote = '';
  isOptimizingWarcry = false;
  warcryExploredCount = 0;
  warcryHighestLevelSeen = 0;
  warcryBestWarcry = 0;
  warcryMaxValue = 0;

  optimizationTargetLevel = 20;
  optimizationReservePercent = 0;
  optimizationMinMetric: OptimizationMetric | '' = '';
  optimizationMinValue = 0;
  optimizationMaxWarcry = 0;
  optimizationNote = '';
  optimizationExploredCount = 0;
  optimizationHighestLevelSeen = 0;
  optimizationBestScore = 0;
  isOptimizingStats = false;
  optimizationWeights: OptimizationWeight[] = [
    { key: 'offense', label: 'Offense', weight: 1 },
    { key: 'defense', label: 'Defense', weight: 1 },
    { key: 'immunity', label: 'Immunity', weight: 1 },
    { key: 'freeze', label: 'Freeze', weight: 0 },
    { key: 'lightning', label: 'Lightning', weight: 0 },
    { key: 'fire', label: 'Fire', weight: 0 },
    { key: 'warcry', label: 'Warcry', weight: 0 }
  ];

  isAboveBase(statKey: string): boolean {
    return (this.selectedBuild?.stats?.[statKey]?.base ?? 0) > 1;
  }

  addNewBuild() {
    var newBuild = new Build();
    newBuild.name = `New Build ${this.builds.length + 1}`
    newBuild.calculateAllXp();
    this.selectedBuild = newBuild;
    this.builds.push(newBuild);
  }

  cloneSelectedBuild() {
    var cloneBuild = new Build();
    cloneBuild.selectedClass = this.selectedBuild?.selectedClass || Classes.Seyan;
    cloneBuild.hardcore = this.selectedBuild?.hardcore ?? true;
    cloneBuild.blessed = this.selectedBuild?.blessed ?? true;
    cloneBuild.maxingBless = this.selectedBuild?.maxingBless ?? true;
    cloneBuild.maxingEquipment = this.selectedBuild?.maxingEquipment ?? true;
    cloneBuild.unarched = this.selectedBuild?.unarched ?? false;
    cloneBuild.statRows = JSON.parse(JSON.stringify(this.selectedBuild?.statRows || []));
    cloneBuild.profRows = JSON.parse(JSON.stringify(this.selectedBuild?.profRows || []));
    cloneBuild.name = this.selectedBuild?.name + " Clone";
    cloneBuild.calculateAllXp();
    this.selectedBuild = cloneBuild;
    this.builds.push(cloneBuild);
  }

  selectBuild(build : Build) {
    build.calculateAllXp();
    this.selectedBuild = build;
    this.isMobileMenuOpen = false;
    this.copyConfirmation = '';
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  removeBuild(buildId: number) {

  }
  selectText(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.select();
  }

  get currentBuildShareToken(): string {
    if (!this.selectedBuild) {
      return '';
    }
    try {
      return this.selectedBuild.serialize();
    } catch (error) {
      console.error('Unable to serialize build', error);
      return '';
    }
  }

  get currentBuildShareUrl(): string {
    const token = this.currentBuildShareToken;
    if (!token) return '';

    if (typeof window === 'undefined') {
      return token;
    }

    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}?build=${encodeURIComponent(token)}`;
  }

  async copyBuildShareUrl() {
    const shareUrl = this.currentBuildShareUrl;
    if (!shareUrl) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.copyConfirmation = 'Build link copied to clipboard';
    } catch (error) {
      console.error('Failed to copy build share link', error);
      this.copyConfirmation = 'Unable to copy link';
    }

    setTimeout(() => {
      this.copyConfirmation = '';
    }, 2000);
  }

  openDeleteModal(build: Build): void {
    this.buildToDelete = build;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.buildToDelete = null;
    this.isDeleteModalOpen = false;
  }

  confirmDelete(): void {
    if (this.buildToDelete) {
      this.builds = this.builds.filter(b => b.id !== this.buildToDelete?.id);
      this.saveBuilds(); 
      if (this.builds.length > 0) {
        this.selectedBuild = this.builds[this.builds.length - 1];
      }
      this.closeDeleteModal();
    }
  }

  // Method to open the modal
  openHiddenRowsModal() {
    this.isManageHiddenRowsModalOpen = true;
  }

  // Method to close the modal
  closeHiddenRowsModal() {
    this.isManageHiddenRowsModalOpen = false;
  }

  // Method to open the modal
  openLoadModal() {
    this.isLoadModalOpen = true;
  }

  // Method to close the modal
  closeLoadModal() {
    this.isLoadModalOpen = false;
  }

  tryLoadBuildFromQuery() {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const encodedBuild = params.get('build');
    if (!encodedBuild) {
      return;
    }

    const normalizedBuild = encodedBuild.replace(/ /g, '+');
    const importedBuild = Build.fromSerialized(normalizedBuild);
    if (!importedBuild) {
      return;
    }

    importedBuild.calculateAllXp();
    this.builds.push(importedBuild);
    this.selectedBuild = importedBuild;
    this.saveBuilds();
  }

   // Method to trigger the file input
   triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLElement;
    fileInput.click();
  }

  // Method to handle drag over event
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Method to handle file drop event
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.loadFilesFromDrop(event.dataTransfer.files);
      event.dataTransfer.clearData();
    }
  }


  // Method to handle file selection from the input
  loadFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.loadFilesFromDrop(input.files);
    }
  }

  // Method to process files from drop or file input
  loadFilesFromDrop(files: FileList) {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const fileContent = e.target.result;
        this.processBuildFile(fileContent, this.selectedBuildType, file.name);
      };
      
      reader.readAsText(file);
    });

    this.closeLoadModal(); // Close modal after files are loaded
  }

  // Method to process the loaded build file
  processBuildFile(content: string, buildType: string, fileName: string) {
    let buildData: any;

    let newBuild = new Build();

    if (this.selectedBuildType == "Widget") {

      let indexOfPeriod = fileName.indexOf('.');
      newBuild.name = fileName.substring(0, indexOfPeriod == -1 ? fileName.length : indexOfPeriod);
      newBuild.calculateAllXp();

      const lines = content.split(/\r?\n/);
      
      const WidgetStatOrder =
      [
        Stats.HP,
        Stats.ENDURANCE,
        Stats.MANA,
        Stats.WIS,
        Stats.INT,
        Stats.AGI,
        Stats.STR,
        Stats.DAGGER, 
        Stats.H2H,
        Stats.SWORD,
        Stats.TWOHAND,
        Stats.STAFF,
        Stats.RAGE,
        Stats.ARMOR_SKILL, 
        Stats.ATTACK,
        Stats.PARRY,
        Stats.WARCRY,
        Stats.TACTICS,
        Stats.SURROUND_HIT,
        Stats.BODY_CONTROL,
        Stats.SPEED_SKILL, 
        Stats.BLESS, 
        Stats.HEAL, 
        Stats.FREEZE, 
        Stats.MAGIC_SHIELD,
        Stats.LIGHTNING,
        Stats.FIRE,
        Stats.PULSE,
        Stats.DURATION,
        Stats.BARTERING,
        Stats.PERCEPTION, 
        Stats.STEALTH, 
        Stats.REGENERATE,
        Stats.MEDITATE,
        Stats.IMMUNITY,
        Stats.PROFESSION
      ]



      let hc = false;
      let maxingBless = false;
      let athlete = 0;
      let cw = 0;
      let val1 = 0;
      let lineNumber = 0;
      let statIndex = 0;
      
      var statsArray : string[] = [];

      for (const line of lines) {
        const s = line.trim();
        switch (lineNumber) {
          case 0:

            switch (s) {
              case 'warr':
                newBuild.selectedClass = Classes.Warrior;
                statsArray = WidgetStatOrder;
                break;
              case 'mage':
                newBuild.selectedClass = Classes.Mage;
                statsArray = WidgetStatOrder;
                break;
              case 'seyan':
                newBuild.selectedClass = Classes.Seyan;
                statsArray = WidgetStatOrder;
                break;
            }

            break;
          case 1:
            hc = s === '1';
            break;
          case 2:
            maxingBless = s === '1';
            break;
          case 3:
            athlete = parseInt(s, 10);
            break;
          default:

            if (s.length == 0) continue;
            if (statIndex >= statsArray.length) break;
            else if (lineNumber % 2 === 0 ) {
              let stat = statsArray[statIndex];
              console.log(`Setting ${stat} base to ${s}`);
              newBuild.stats[stat].base = parseInt(s, 10);
            } else if (lineNumber % 2 === 1) {
              let stat = statsArray[statIndex];
              if (stat == Stats.PROFESSION) {
                cw = parseInt(s, 10);
              } else {
                console.log(`Setting ${stat} eq to ${s}`);
                newBuild.stats[stat].equipmentBonus = parseInt(s, 10);
              }
              statIndex++;
            }

            break;
        }
        lineNumber++;
      }

      newBuild.profs[Professions.CW].points = cw;
      newBuild.profs[Professions.ATHLETE].points = athlete;

    } else if (this.selectedBuildType == "Val") {

      let indexOfPeriod = fileName.indexOf('.');
      newBuild.name = fileName.substring(0, indexOfPeriod == -1 ? fileName.length : indexOfPeriod);
      newBuild.calculateAllXp();

      var statsArray : string[] = [];
      
      const ValSeyanStatOrder =
      [
        Stats.HP,
        Stats.ENDURANCE,
        Stats.MANA,
        Stats.WIS,
        Stats.INT,
        Stats.AGI,
        Stats.STR,
        Stats.DAGGER, 
        Stats.H2H,
        Stats.SWORD,
        Stats.TWOHAND,
        Stats.ARMOR_SKILL, 
        Stats.ATTACK,
        Stats.PARRY,
        Stats.TACTICS,
        Stats.WARCRY,
        Stats.SURROUND_HIT,
        Stats.BODY_CONTROL,
        Stats.SPEED_SKILL, 
        Stats.BLESS, 
        Stats.HEAL, 
        Stats.FREEZE, 
        Stats.MAGIC_SHIELD,
        Stats.LIGHTNING,
        Stats.FIRE,
        Stats.PULSE,
        Stats.BARTERING,
        Stats.PERCEPTION, 
        Stats.STEALTH, 
        Stats.REGENERATE,
        Stats.MEDITATE,
        Stats.IMMUNITY,
        Stats.PROFESSION
      ]

      const ValMageStatOrder =
      [
        Stats.HP,
        Stats.ENDURANCE,
        Stats.MANA,
        Stats.WIS,
        Stats.INT,
        Stats.AGI,
        Stats.STR,
        Stats.DAGGER, 
        Stats.H2H,
        Stats.STAFF,
        Stats.BLESS, 
        Stats.HEAL, 
        Stats.FREEZE, 
        Stats.MAGIC_SHIELD,
        Stats.LIGHTNING,
        Stats.FIRE,
        Stats.PULSE,
        Stats.DURATION,
        Stats.BARTERING,
        Stats.PERCEPTION, 
        Stats.STEALTH, 
        Stats.MEDITATE,
        Stats.IMMUNITY,
        Stats.PROFESSION
      ]

      const ValWarrStatOrder =
      [
        Stats.HP,
        Stats.ENDURANCE,
        Stats.WIS,
        Stats.INT,
        Stats.AGI,
        Stats.STR,
        Stats.DAGGER, 
        Stats.H2H,
        Stats.SWORD,
        Stats.TWOHAND,
        Stats.RAGE,
        Stats.ARMOR_SKILL, 
        Stats.ATTACK,
        Stats.PARRY,
        Stats.WARCRY,
        Stats.TACTICS,
        Stats.SURROUND_HIT,
        Stats.BODY_CONTROL,
        Stats.SPEED_SKILL, 
        Stats.BARTERING,
        Stats.PERCEPTION, 
        Stats.STEALTH, 
        Stats.REGENERATE,
        Stats.IMMUNITY,
        Stats.PROFESSION
      ]

      let buildClassName = fileName.substring(indexOfPeriod+1);
      switch (buildClassName) {
        case 'war':
          newBuild.selectedClass = Classes.Warrior;
          statsArray = ValWarrStatOrder;
          break;
        case 'mag':
          newBuild.selectedClass = Classes.Mage;
          statsArray = ValMageStatOrder;
          break;
        case 'sey':
          newBuild.selectedClass = Classes.Seyan;
          statsArray = ValSeyanStatOrder;
          break;
      }

      const lines = content.split(/\r?\n/);

      let hc = false;
      let maxingBless = false;
      let athlete = 0;
      let cw = 0;
      let lwdw = 0;
      let thief = 0;
      let lineNumber = 0;
      let statIndex = 0;
      let armorSkillIndex = statsArray.indexOf(Stats.ARMOR_SKILL);

      for (const line of lines) {
        const s = line.trim();
        if (lineNumber < statsArray.length) {

          let index = lineNumber;
          let stat = statsArray[index];

          console.log(`Setting ${stat} base to ${s}`);
          newBuild.stats[stat].base = parseInt(s, 10);

        } else if (lineNumber < statsArray.length + 4) {

          let profIndex = lineNumber - statsArray.length;
          let points = parseInt(s, 10);
          switch (profIndex) {
            case 0: lwdw = points; break;
            case 1: cw = points; break;
            case 2: athlete = points; break;
            case 3: thief = points; break;
          }

        } else if (lineNumber < statsArray.length*2 + 4) {

          let index = lineNumber - statsArray.length - 4;
          
          let stat = statsArray[index];
          if (stat == Stats.PROFESSION) {
            
          } else if (armorSkillIndex > -1 && index >= armorSkillIndex) {
            
            stat = statsArray[index + 1];

          }
          
          {
            console.log(`Setting ${stat} eq to ${s}`);
            newBuild.stats[stat].equipmentBonus = parseInt(s, 10);
          }
          statIndex++;
          
        } else {

        }

        lineNumber++;
      }

      if (newBuild.profs[Professions.LWDW]) newBuild.profs[Professions.LWDW].points = lwdw;
      newBuild.profs[Professions.CW].points = cw;
      newBuild.profs[Professions.ATHLETE].points = athlete;
      newBuild.profs[Professions.THIEF].points = thief;
    
    } else if (this.selectedBuildType == "A3Res") {

    } else if (this.selectedBuildType == "Resurgence") {

      interface ResurgenceStat {
        base: number;
        mod?: number;
      }
      
      interface ResurgenceCharacter {
        class: string;
      }
      
      interface ResurgenceSettings {
        ShowTact: boolean;
        ShowBless: boolean;
        MaxBless: boolean;
        Arch: boolean;
        Hardcore: boolean;
      }
      
      interface ResurgenceBuild {
        Character: ResurgenceCharacter;
        Hitpoints: ResurgenceStat;
        Endurance: ResurgenceStat;
        Mana: ResurgenceStat;
        Wisdom: ResurgenceStat;
        Intuition: ResurgenceStat;
        Agility: ResurgenceStat;
        Strength: ResurgenceStat;
        Dagger: ResurgenceStat;
        "Hand to Hand": ResurgenceStat;
        Sword: ResurgenceStat;
        "Two-Handed": ResurgenceStat;
        "Armor Skill": ResurgenceStat;
        Attack: ResurgenceStat;
        Parry: ResurgenceStat;
        Tactics: ResurgenceStat;
        Warcry: ResurgenceStat;
        "Surround Hit": ResurgenceStat;
        "Body Control": ResurgenceStat;
        "Speed Skill": ResurgenceStat;
        Bless: ResurgenceStat;
        Heal: ResurgenceStat;
        Freeze: ResurgenceStat;
        "Magic Shield": ResurgenceStat;
        Lightning: ResurgenceStat;
        Fire: ResurgenceStat;
        Pulse: ResurgenceStat;
        Barter: ResurgenceStat;
        Perception: ResurgenceStat;
        Stealth: ResurgenceStat;
        Regen: ResurgenceStat;
        Meditate: ResurgenceStat;
        Immunity: ResurgenceStat;
        Profession: ResurgenceStat;
        LDW: ResurgenceStat;
        CW: ResurgenceStat;
        Ath: ResurgenceStat;
        Thief: ResurgenceStat;
        Settings: ResurgenceSettings;
      }

      let statMap = {
        [Stats.REGENERATE] : "Regen",
        [Stats.BARTERING] : "Barter"
      }

      let profMap = {
        [Professions.LWDW] : "LDW",
        [Professions.ATHLETE] : "Ath",
        [Professions.CW] : "CW"
      }

      let indexOfPeriod = fileName.indexOf('.');
      newBuild.name = fileName.substring(0, indexOfPeriod == -1 ? fileName.length : indexOfPeriod);
      newBuild.calculateAllXp();

      const resurgenceBuild: any = JSON.parse(content);

      newBuild.statRows.forEach(stat => {

        let statName = stat.name;
        if (resurgenceBuild[statName] == null) {
          statName = statMap[statName];
        }

        if (resurgenceBuild[statName] != null) {
          var resurgenceRow : ResurgenceStat = resurgenceBuild[statName];

          stat.base = resurgenceRow.base;
          stat.equipmentBonus = resurgenceRow.mod ?? 0;
        }
      });
      
      newBuild.profRows.forEach(prof => {

        let profName = prof.name;
        if (resurgenceBuild[profName] == null) {
          profName = profMap[profName];
        }

        if (resurgenceBuild[profName] != null) {
          var resurgenceRow : ResurgenceStat = resurgenceBuild[profName];

          prof.points = resurgenceRow.base;
        }
      });

      var resurgenceSettings : ResurgenceSettings = resurgenceBuild["Settings"];

      newBuild.hardcore = resurgenceSettings.Hardcore;
      newBuild.blessed = resurgenceSettings.ShowBless;
      newBuild.maxingBless = resurgenceSettings.MaxBless;
      newBuild.unarched = resurgenceSettings.Arch === false;

    }
 
    newBuild.calculateAllXp();
    this.builds.push(newBuild);

    if (this.builds.length > 0) {
      this.selectedBuild = this.builds[this.builds.length-1];
    }
  }

  // Method to apply the build data to the current build
  applyBuildData(buildData: any, buildType: string, fileName: string) {
    
    ;
  }

  async optimizeWarcry() {
    if (!this.selectedBuild) {
      return;
    }

    if (!this.selectedBuild.maxingEquipment) {
      this.selectedBuild.maxingEquipment = true;
      this.selectedBuild.calculateAllXp();
    }

    const requestedTargetLevel = Math.max(1, Number(this.warcryTargetLevel) || 1);
    const targetLevel = Number.isInteger(requestedTargetLevel)
      ? requestedTargetLevel 
      : requestedTargetLevel;

    this.isOptimizingWarcry = true;
    this.warcryExploredCount = 0;
    this.warcryHighestLevelSeen = 0;
    this.warcryBestWarcry = 0;
    this.warcryOptimizationNote = 'Exploring candidates...';

    // Defer heavy work to allow the UI to render the “in progress” state first
    await new Promise(resolve => setTimeout(resolve, 0));

    const progress: WarcryOptimizationProgress = {
      exploredCount: 0,
      highestLevelSeen: 0,
      bestWarcry: 0,
      bestBuildLevel: 0
    };

    const updateProgress = (p: WarcryOptimizationProgress) => {
      this.warcryExploredCount = p.exploredCount;
      this.warcryHighestLevelSeen = p.highestLevelSeen;
      this.warcryBestWarcry = p.bestWarcry;
    };

    try {
      const maxWarcry = Math.max(0, Number(this.warcryMaxValue) || 0);
      const optimizedBuild = await this.selectedBuild.createWarcryOptimizedBuild(
        targetLevel,
        progress,
        updateProgress,
        undefined,
        undefined,
        requestedTargetLevel >= 20,
        maxWarcry
      );
      optimizedBuild.name = `${this.selectedBuild.name} - WC L${Math.round(requestedTargetLevel)}`;

      this.builds.push(optimizedBuild);
      this.selectedBuild = optimizedBuild;
      this.saveBuilds();

      const warcryResult = optimizedBuild.warcry;
      const resultLevel = optimizedBuild.totalLevel;

      const limitNote = progress.limitReached
        ? ` Stopped after exploring ${this.warcryExploredCount.toLocaleString()} candidates.`
        : '';
      this.warcryOptimizationNote = `Created ${optimizedBuild.name} from minimal stats with warcry ${warcryResult} at level ${resultLevel.toFixed(2)}.${limitNote}`;
      this.warcryExploredCount = progress.exploredCount;
      this.warcryHighestLevelSeen = progress.highestLevelSeen;
      this.warcryBestWarcry = progress.bestWarcry;
    } catch (error) {
      console.error('Warcry optimization failed', error);
      this.warcryOptimizationNote = 'Warcry optimization failed. See console for details.';
    } finally {
      this.isOptimizingWarcry = false;
    }
  }

  private getOptimizationWeightMap(): Record<OptimizationMetric, number> {
    const base: Record<OptimizationMetric, number> = {
      offense: 0,
      defense: 0,
      immunity: 0,
      freeze: 0,
      lightning: 0,
      fire: 0,
      warcry: 0
    };

    this.optimizationWeights.forEach(weight => {
      base[weight.key] = Number.isFinite(weight.weight) ? weight.weight : 0;
    });

    return base;
  }

  async optimizeStats() {
    if (!this.selectedBuild) {
      return;
    }

    if (!this.selectedBuild.maxingEquipment) {
      this.selectedBuild.maxingEquipment = true;
      this.selectedBuild.calculateAllXp();
    }

    const requestedTargetLevel = Math.max(1, Number(this.optimizationTargetLevel) || 1);
    const targetLevel = Number.isInteger(requestedTargetLevel) ? requestedTargetLevel : requestedTargetLevel;
    const reservePercent = Math.min(99, Math.max(0, Number(this.optimizationReservePercent) || 0));
    const maxWarcry = Math.max(0, Number(this.optimizationMaxWarcry) || 0);
    const minRequirement = this.optimizationMinMetric
      ? { metric: this.optimizationMinMetric, value: Math.max(0, Number(this.optimizationMinValue) || 0) }
      : undefined;

    this.isOptimizingStats = true;
    this.optimizationExploredCount = 0;
    this.optimizationHighestLevelSeen = 0;
    this.optimizationBestScore = 0;
    this.optimizationNote = 'Exploring candidates...';

    await new Promise(resolve => setTimeout(resolve, 0));

    const progress: OptimizationProgress = {
      exploredCount: 0,
      highestLevelSeen: 0,
      bestScore: 0,
      bestBuildLevel: 0
    };

    const updateProgress = (p: OptimizationProgress) => {
      this.optimizationExploredCount = p.exploredCount;
      this.optimizationHighestLevelSeen = p.highestLevelSeen;
      this.optimizationBestScore = p.bestScore;
    };

    try {
      const optimizedBuild = await this.selectedBuild.createWeightedOptimizedBuild(
        {
          targetLevel,
          reservePercent,
          weights: this.getOptimizationWeightMap(),
          minRequirement,
          maxWarcry
        },
        progress,
        updateProgress
      );

      optimizedBuild.name = `${this.selectedBuild.name} - Opt L${Math.round(requestedTargetLevel)}`;

      this.builds.push(optimizedBuild);
      this.selectedBuild = optimizedBuild;
      this.saveBuilds();

      this.optimizationNote = `Created ${optimizedBuild.name} at level ${optimizedBuild.totalLevel.toFixed(2)} with score ${this.optimizationBestScore.toFixed(2)}.`;
      this.optimizationExploredCount = progress.exploredCount;
      this.optimizationHighestLevelSeen = progress.highestLevelSeen;
      this.optimizationBestScore = progress.bestScore;
    } catch (error) {
      console.error('Stat optimization failed', error);
      this.optimizationNote = 'Stat optimization failed. See console for details.';
    } finally {
      this.isOptimizingStats = false;
    }
  }
  
  displayStats = [
    Stats.HP,
    Stats.ENDURANCE,
    Stats.MANA,
    null,
    Stats.WIS,
    Stats.INT,
    Stats.AGI,
    Stats.STR,
    null,
    Stats.DAGGER, 
    Stats.H2H,
    Stats.STAFF,
    Stats.SWORD,
    Stats.TWOHAND,
    Stats.RAGE,
    null,
    Stats.ARMOR_SKILL, 
    Stats.ATTACK,
    Stats.PARRY,
    Stats.WARCRY,
    Stats.TACTICS,
    Stats.SURROUND_HIT,
    Stats.BODY_CONTROL,
    Stats.SPEED_SKILL, 
    null,
    Stats.BLESS, 
    Stats.HEAL, 
    Stats.FREEZE, 
    Stats.MAGIC_SHIELD,
    Stats.LIGHTNING,
    Stats.FIRE,
    Stats.PULSE,
    Stats.DURATION,
    null,
    Stats.BARTERING,
    Stats.PERCEPTION, 
    Stats.STEALTH, 
    Stats.REGENERATE,
    Stats.MEDITATE,
    Stats.IMMUNITY,
    null,
    Stats.PROFESSION
  ]



  speedBreaks : number[] = []

  buildSpeedBreaksTable() {

    let cost = 8;

    /*
    // translate character speed into ticks
    int speed(int speedy,int mode,int ticks)
    {
      double f;

      if (speedy>0) speedy/=2;
      else speedy=speedy*0.75;

      if (mode==SM_FAST) speedy+=40;
      if (mode==SM_STEALTH) speedy-=40;

            f=0.75+speedy/288.0;

      if (f<0.2) f=0.2;
      if (f>2.0) f=2.0;

      ticks/=f;

      // 2 = 8/(0.75+speed/576);
      // 0.75 + speed/576 = 4
      // speed = 3.25 * 576;

      if (ticks<2) return 2;
      if (ticks>255) return 255;

      return ticks;
    }
    */

    let modes = ["Fast", "Normal", "Stealth"];
    let tickCategories = [6, 8, 12];

    modes.forEach(modeCategory => {

      this.modeTickActions[modeCategory] = [];

      for (var i = 0; i <= 32; i++) {
        this.modeTickActions[modeCategory].push([10000, 10000, 10000]);
      }
    });

    for (var speed = -1000; speed <= 720; speed++) {
      
      var j = 0;
      tickCategories.forEach(tickCategory => {

        modes.forEach(modeCategory => {

          let resultingTick = Math.fround(this.calcTicks(speed, modeCategory, tickCategory));

          let resultingTickFloor = Math.floor(resultingTick);
  
          if (resultingTickFloor > 0 && resultingTickFloor < this.modeTickActions[modeCategory].length) {
  
            this.modeTickActions[modeCategory][resultingTickFloor][j] = Math.min(this.modeTickActions[modeCategory][resultingTickFloor][j], speed);
          }
        });

        j++;
      });

    }
  }

  modeTickActions : {[key: string] : number[][]} = {}

  calcTicks(speed : number, mode : string, baseTicks : number) {
    let speedy = speed;
    
    if (speedy > 0)
      speedy = Math.floor(speed/2);
    else speedy=Math.fround(speedy*0.75);

    if (mode == "Fast") {
      speedy += 40;
    } else if (mode == "Stealth") {
      speedy -= 40;
    }

    let f = 0.75 + Math.fround(speedy/288);

    if (f<0.2) f=0.2;
    if (f>2.0) f=2.0;

    let ticks = baseTicks / f;
    return ticks;
  }

  getNextSpeedBreak(baseTicks: number): { tick: number; speed: number } | null {
    if (!this.selectedBuild || !this.modeTickActions[this.selectedBuild.speedMode]) {
      return null;
    }

    const actionIndex = baseTicks === 6 ? 0 : baseTicks === 8 ? 1 : 2;
    const modeBreaks = this.modeTickActions[this.selectedBuild.speedMode] ?? [];
    const currentSpeed = this.selectedBuild.speed ?? 0;

    const sortedBreaks = modeBreaks
      .map((row, tick) => ({ tick, speed: row?.[actionIndex] }))
      .filter((entry) => entry.speed !== undefined && entry.speed !== 10000 && entry.speed !== -1000)
      .sort((a, b) => a.speed - b.speed);

    const nextBreak = sortedBreaks.find((entry) => entry.speed > currentSpeed);
    return nextBreak ?? null;
  }

  getNextSpeedBreaks() {
    const configs = [
      { baseTicks: 12, label: 'Cast 2 / Move 1 / Melee' },
      { baseTicks: 8, label: 'Move 2 / Use' },
      { baseTicks: 6, label: 'Cast 1 (LB)' }
    ];

    return configs.map(config => ({
      ...config,
      nextBreak: this.getNextSpeedBreak(config.baseTicks)
    }));
  }
}


class Build {


  id : string = this.generateUniqueId()
  comparisonBuilds : Build[] = []

  // User options
  name: string = "New Build 1";
  selectedClass: string = Classes.Seyan; // Default to Seyan
  blessed = true;
  maxingBless = true;
  hardcore = true;
  maxingEquipment = true;
  unarched = false;
  thiefMode = false;
  tacticsActive = true;
  rageActive = true;


  // Calculated values
  totalExp: number = 0;
  totalLevel: number = 0;
  weaponValue = 0;
  armorValue = 0.00;
  speed = 0;
  offense = 0;
  defense = 0;
  surroundOffense = 0;

  warcriedSpeed = 0;
  frozenSpeed = 0;

  speedMode = "Fast";

  // mods with tactics
  warcry = 0;
  lightning = 0;
  fire = 0;
  freeze = 0;
  immunity = 0;

  // Compared values
  bestComparedWeaponValue = 0;
  bestComparedArmorValue = 0.00;
  bestComparedSpeed = 0;
  bestComparedOffense = 0;
  bestComparedDefense = 0;
  bestComparedImmunity = 0;

  pinnedStats : string[] = []


  usedProfessionPoints = 0;
  remainingProfessionPoints = 0;

  // Easily access stats
  stats: { [key: string]: StatRow } = {};
  profs: { [key: string]: ProfessionRow } = {};
  hiddenStats: { [key: string]: StatRow } = {};

  weapons = [Stats.DAGGER, Stats.H2H, Stats.STAFF, Stats.SWORD, Stats.TWOHAND]
  currentWeapon : StatRow | null = null;
  // Clan Wars' offense/defense use the highest weapon *mod*, not the weapon you
  // happen to have the highest base in.
  weaponSkillMod = 0;
  
  // Example data model representing the rows
  statRows : StatRow[] = [
    { name: Stats.HP, base: 10, mod: 10, minBase: 10, maxBase: 250, expFactor: 3, equipmentBonus: 0, ptmDisabled: true },
    { name: Stats.ENDURANCE, base: 10, mod: 10, minBase: 10, maxBase: 250, expFactor: 3, equipmentBonus: 0, ptmDisabled: true },
    { name: Stats.MANA, base: 10, mod: 10, minBase: 10, maxBase: 250, expFactor: 3, equipmentBonus: 0, ptmDisabled: true },
  
    { name: Stats.WIS, base: 10, mod: 12, minBase: 10, maxBase: 250, expFactor: 2, equipmentBonus: 0  },
    { name: Stats.INT, base: 10, mod: 13, minBase: 10, maxBase: 250, expFactor: 2, equipmentBonus: 0  },
    { name: Stats.AGI, base: 10, mod: 11, minBase: 10, maxBase: 250, expFactor: 2, equipmentBonus: 0  },
    { name: Stats.STR, base: 10, mod: 10, minBase: 10, maxBase: 250, expFactor: 2, equipmentBonus: 0  },

    { name: Stats.DAGGER, base: 1, mod: 8, minBase: 1, maxBase: 250, expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR] },
    { name: Stats.H2H, base: 1, mod: 8, minBase: 1, maxBase: 250, expFactor: 1, equipmentBonus: 0, attributes : [Stats.AGI, Stats.AGI, Stats.STR]  },
    { name: Stats.STAFF, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },
    { name: Stats.SWORD, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },
    { name: Stats.TWOHAND, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.AGI, Stats.AGI, Stats.STR]  },
   
    { name: Stats.RAGE, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.STR, Stats.STR] },
    { name: Stats.ARMOR_SKILL, equipmentDisabled: true, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: null, attributes : [Stats.AGI, Stats.AGI, Stats.STR]  },
    { name: Stats.ATTACK, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },
    { name: Stats.PARRY, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },
    { name: Stats.WARCRY, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },
    { name: Stats.TACTICS, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },
    { name: Stats.SURROUND_HIT, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },
    { name: Stats.BODY_CONTROL, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },
    { name: Stats.SPEED_SKILL, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.STR]  },

    { name: Stats.BLESS, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS]  },
    { name: Stats.HEAL, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS]  },
    { name: Stats.FREEZE, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS] },
    { name: Stats.MAGIC_SHIELD, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS]  },
    { name: Stats.LIGHTNING, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS]  },
    { name: Stats.FIRE, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS]  },
    { name: Stats.PULSE, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS]  },
    { name: Stats.DURATION, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage], expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.STR, Stats.WIS]  },

    { name: Stats.BARTERING, base: 1, mod: 8, minBase: 1, maxBase: 250, expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS]  },
    { name: Stats.PERCEPTION, base: 1, mod: 8, minBase: 1, maxBase: 250, expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.INT, Stats.WIS]  },
    { name: Stats.STEALTH, base: 1, mod: 8, minBase: 1, maxBase: 250, expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.AGI, Stats.AGI]  },
    { name: Stats.REGENERATE, base: 1, mod: 7, minBase: 1, maxBase: 250, visibleFor: [Classes.Warrior, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.STR, Stats.STR, Stats.STR]  },
    { name: Stats.MEDITATE, base: 1, mod: 8, minBase: 1, maxBase: 250, visibleFor: [Classes.Mage, Classes.Seyan], expFactor: 1, equipmentBonus: 0, attributes : [Stats.WIS, Stats.WIS, Stats.WIS]  },
    { name: Stats.IMMUNITY, base: 1, mod: 8, minBase: 1, maxBase: 250, expFactor: 1, equipmentBonus: 0, attributes : [Stats.INT, Stats.STR, Stats.WIS]  },
  
    { name: Stats.PROFESSION, equipmentDisabled: true, modDisabled: true, base: 1, mod: null, minBase: 1, maxBase: 250, expFactor: 3, equipmentBonus: null, ptmDisabled: true  },
  ];

  profRows : ProfessionRow[] = [
    {name: Professions.CW, basePoints: 6,points: 0, improvePoints: 3, max: 30},
    {name: Professions.ATHLETE, basePoints: 6,points: 0, improvePoints: 3, max: 30},
    {name: Professions.THIEF, basePoints: 6,points: 0, improvePoints: 3, max: 30},
  ]




  // Method to show mod details on hover or tap
  showModDetails(row: StatRow) {
    row.showDetails = true;
  }

  hideModDetails(row: StatRow) {
    row.showDetails = false;
  }

  toggleModDetails(row: StatRow) {
    if (row.showDetails == null) row.showDetails = true;
    else row.showDetails = !row.showDetails;
  }

  // Methods to increment or decrement the values
  increment(row: StatRow) {
    if (row.base < row.maxBase) {
      row.base++;
    }
  }
  
  decrement(row: StatRow) {
    if (row.base > row.minBase) {
      row.base--;
    }
  }

  incrementProf(row: ProfessionRow) { 
    if (row.points < row.basePoints) {
      row.points = row.basePoints;
    } else if (row.points < row.max - row.improvePoints) {
      row.points = row.points + row.improvePoints;
    } else {
      row.points = row.max;
    }
  }
  
  decrementProf(row: ProfessionRow) {
    if (row.points < row.basePoints + row.improvePoints) {
      row.points = 0;
    } else if (row.points < row.max + row.improvePoints) {
      row.points = row.points - row.improvePoints;
    } else {
      row.points = row.max;
    }
  }
  // Method to check if a row should be visible based on the selected class
  isVisible(row: any): boolean {
    return !row || !row.visibleFor || row.visibleFor.includes(this.selectedClass);
  }

  generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  isComparing(otherBuild : Build) {
    return this.comparisonBuilds.some(build => build.id === otherBuild.id);
  }

  toggleComparison(otherBuild : Build) {
    if (this.isComparing(otherBuild)) {
      this.comparisonBuilds = this.comparisonBuilds.filter(build => build.id !== otherBuild.id);
    } else {
      this.comparisonBuilds.push(otherBuild);
    }
  }

  clone(): Build {
    const clone = new Build();

    clone.selectedClass = this.selectedClass;
    clone.blessed = this.blessed;
    clone.maxingBless = this.maxingBless;
    clone.hardcore = this.hardcore;
    clone.maxingEquipment = this.maxingEquipment;
    clone.unarched = this.unarched;
    clone.thiefMode = this.thiefMode;
    clone.tacticsActive = this.tacticsActive;
    clone.rageActive = this.rageActive;

    clone.statRows = JSON.parse(JSON.stringify(this.statRows));
    clone.profRows = JSON.parse(JSON.stringify(this.profRows));
    clone.name = this.name;
    clone.id = this.generateUniqueId();

    clone.calculateAllXp();

    return clone;
  }

  serialize(): string {
    const payload = {
      name: this.name,
      selectedClass: this.selectedClass,
      blessed: this.blessed,
      maxingBless: this.maxingBless,
      hardcore: this.hardcore,
      maxingEquipment: this.maxingEquipment,
      unarched: this.unarched,
      thiefMode: this.thiefMode,
      tacticsActive: this.tacticsActive,
      rageActive: this.rageActive,
      speedMode: this.speedMode,
      statRows: this.statRows.map(row => ({
        name: row.name,
        base: row.base,
        equipmentBonus: row.equipmentBonus,
        isHidden: row.isHidden ?? false,
        isPinned: row.isPinned ?? false
      })),
      profRows: this.profRows.map(row => ({
        name: row.name,
        points: row.points
      }))
    };

    return Build.encodeString(JSON.stringify(payload));
  }

  static fromSerialized(serialized: string): Build | null {
    try {
      const json = Build.decodeString(serialized);
      const payload = JSON.parse(json);
      const build = new Build();

      build.name = payload.name ?? build.name;
      build.selectedClass = payload.selectedClass ?? build.selectedClass;
      build.blessed = payload.blessed ?? build.blessed;
      build.maxingBless = payload.maxingBless ?? build.maxingBless;
      build.hardcore = payload.hardcore ?? build.hardcore;
      build.maxingEquipment = payload.maxingEquipment ?? build.maxingEquipment;
      build.unarched = payload.unarched ?? build.unarched;
      build.thiefMode = payload.thiefMode ?? build.thiefMode;
      build.tacticsActive = payload.tacticsActive ?? build.tacticsActive;
      build.rageActive = payload.rageActive ?? build.rageActive;
      build.speedMode = payload.speedMode ?? build.speedMode;

      const statOverrides = new Map<string, any>((payload.statRows ?? []).map((row: any) => [row.name, row]));
      build.statRows = build.statRows.map(row => {
        const incoming = statOverrides.get(row.name);
        if (!incoming) {
          return row;
        }

        return {
          ...row,
          base: Number(incoming.base ?? row.base),
          equipmentBonus: Number(incoming.equipmentBonus ?? row.equipmentBonus),
          isHidden: incoming.isHidden ?? row.isHidden,
          isPinned: incoming.isPinned ?? row.isPinned
        };
      });

      const profOverrides = new Map<string, any>((payload.profRows ?? []).map((row: any) => [row.name, row]));
      build.profRows = build.profRows.map(row => {
        const incoming = profOverrides.get(row.name);
        if (!incoming) {
          return row;
        }

        return {
          ...row,
          points: Number(incoming.points ?? row.points)
        };
      });

      build.calculateAllXp();
      return build;
    } catch (error) {
      console.error('Unable to deserialize build', error);
      return null;
    }
  }

  private static encodeString(data: string): string {
    return btoa(unescape(encodeURIComponent(data)));
  }

  private static decodeString(data: string): string {
    return decodeURIComponent(escape(atob(data)));
  }

  async createWarcryOptimizedBuild(
    targetLevel: number,
    progress?: WarcryOptimizationProgress,
    onProgress?: (progress: WarcryOptimizationProgress) => void,
    batchSize = 250,
    beamWidth = 1000,
    allowProfessionUpgrades = true,
    maxWarcry = 0,
    maxExplored = 50000
  ): Promise<Build> {
    const normalizedTargetLevel = (() => {
      const safeLevel = Math.max(1, targetLevel);
      if (Number.isInteger(safeLevel)) {
        return safeLevel + Number.EPSILON;
      }
      return safeLevel;
    })();

    const targetExp = levelToExp(normalizedTargetLevel);
    const normalizedMaxWarcry = Math.max(0, Math.floor(maxWarcry ?? 0));
    const canRaiseProfession = allowProfessionUpgrades && normalizedTargetLevel >= 20;

    const statsToAdjust = [Stats.INT, Stats.AGI, Stats.STR, Stats.WARCRY, Stats.TACTICS, Stats.ENDURANCE];

    const seed = new Build();
    seed.selectedClass = this.selectedClass;
    seed.blessed = this.blessed;
    seed.maxingBless = this.maxingBless;
    seed.hardcore = this.hardcore;
    seed.maxingEquipment = true;
    seed.unarched = this.unarched;
    seed.thiefMode = this.thiefMode;

    seed.statRows = seed.statRows.map(row => ({
      ...row,
      base: row.minBase,
      equipmentBonus: 0
    }));
    seed.profRows = seed.profRows.map(row => ({ ...row, points: 0 }));
    seed.calculateAllXp();

    const warcryDetails = (build: Build) => {
      const warcryMod = build.stats[Stats.WARCRY]?.mod ?? 0;
      const tacticsMod = build.stats[Stats.TACTICS]?.mod ?? 0;
      const tacticsBonus = Math.floor(tacticsMod / 8);
      return {
        warcryMod,
        warcryWithTactics: warcryMod + tacticsBonus
      };
    };

    const equivalentStats = [Stats.INT, Stats.AGI, Stats.STR];
    const shouldSkipEquivalentStatIncrease = (build: Build, statName: string) => {
      if (!equivalentStats.includes(statName)) {
        return false;
      }

      const rows = equivalentStats
        .map(name => build.statRows.find(r => r.name === name))
        .filter((row): row is StatRow => !!row);

      if (rows.length !== equivalentStats.length) {
        return false;
      }

      const targetRow = rows.find(r => r.name === statName);
      if (!targetRow) {
        return false;
      }

      const targetBase = targetRow.base;
      const highestBase = Math.max(...rows.map(r => r.base));

      if (targetBase < highestBase) {
        return false;
      }

      return rows.some(r => r.name !== statName && r.base < targetBase && r.base < r.maxBase);
    };

    const statIndices = statsToAdjust.map(name => seed.statRows.findIndex(r => r.name === name));
    const statIndexLookup = new Map<string, number>();
    statsToAdjust.forEach((name, index) => statIndexLookup.set(name, index));

    const cwIndex = seed.profRows.findIndex(r => r.name === Professions.CW);
    const professionIndex = seed.statRows.findIndex(r => r.name === Stats.PROFESSION);
    const enduranceIndex = statIndexLookup.get(Stats.ENDURANCE) ?? -1;

    if (statIndices.some(index => index === -1) || cwIndex === -1 || professionIndex === -1) {
      throw new Error('Unable to locate required stat or profession rows for warcry optimization.');
    }

    type WarcryState = {
      statBases: number[];
      cwPoints: number;
      professionBase: number;
      totalExp: number;
      warcry: number;
      warcryBase: number;
      enduranceMod: number;
    };

    const serializeState = (state: WarcryState) => [...state.statBases, state.cwPoints, state.professionBase].join(',');

    const workingBuild = seed.clone();
    const candidateWorkingBuild = seed.clone();

    const applyStateToBuild = (state: WarcryState, build: Build) => {
      statsToAdjust.forEach((_, index) => {
        const statRowIndex = statIndices[index];
        build.statRows[statRowIndex].base = state.statBases[index];
      });

      build.profRows[cwIndex].points = state.cwPoints;
      build.statRows[professionIndex].base = state.professionBase;
      build.calculateAllXp();
      return build;
    };

    const evaluateState = (state: WarcryState, build: Build) => {
      applyStateToBuild(state, build);
      state.totalExp = build.totalExp;
      const warcry = warcryDetails(build);
      state.warcry = warcry.warcryWithTactics;
      state.warcryBase = warcry.warcryMod;
      state.enduranceMod = build.stats[Stats.ENDURANCE]?.mod ?? 0;
      return build;
    };

    const initialWarcry = warcryDetails(seed);
    const initialEnduranceMod = seed.stats[Stats.ENDURANCE]?.mod ?? 0;

    const initialState: WarcryState = {
      statBases: statsToAdjust.map((_, index) => seed.statRows[statIndices[index]].base),
      cwPoints: seed.profRows[cwIndex].points,
      professionBase: seed.statRows[professionIndex].base,
      totalExp: seed.totalExp,
      warcry: initialWarcry.warcryWithTactics,
      warcryBase: initialWarcry.warcryMod,
      enduranceMod: initialEnduranceMod
    };

    const visited = new Set<string>();
    let bestSnapshot: WarcryState = { ...initialState, statBases: [...initialState.statBases] };
    let hasValidSnapshot = bestSnapshot.enduranceMod * 3 >= bestSnapshot.warcry;
    const maxQueueSize = Math.max(1, beamWidth);

    const warcryScore = (state: WarcryState) => normalizedMaxWarcry > 0
      ? Math.min(state.warcry, normalizedMaxWarcry)
      : state.warcry;

    const hasReachedWarcryCap = (state: WarcryState) => normalizedMaxWarcry > 0 && state.warcry >= normalizedMaxWarcry;

    const isStateValid = (state: WarcryState) => state.enduranceMod * 3 >= state.warcry;

    const trackBest = (state: WarcryState) => {
      if (!isStateValid(state)) {
        return;
      }

      const stateScore = warcryScore(state);
      const bestScore = hasValidSnapshot ? warcryScore(bestSnapshot) : -Infinity;

      const shouldReplaceBest = (
        !hasValidSnapshot ||
        stateScore > bestScore ||
        (stateScore === bestScore && (
          (hasReachedWarcryCap(state) && !hasReachedWarcryCap(bestSnapshot)) ||
          state.totalExp < bestSnapshot.totalExp
        ))
      );

      if (shouldReplaceBest) {
        bestSnapshot = { ...state, statBases: [...state.statBases] };
        hasValidSnapshot = true;
        lastImprovement = processedStates;
      }

      if (progress) {
        progress.bestWarcry = warcryScore(bestSnapshot);
        progress.bestBuildLevel = expToLevel(bestSnapshot.totalExp);
      }
    };

    const compareStates = (a: WarcryState, b: WarcryState) => {
      const aValid = isStateValid(a);
      const bValid = isStateValid(b);
      if (aValid !== bValid) {
        return bValid ? 1 : -1;
      }

      const warcryDiff = warcryScore(b) - warcryScore(a);
      if (warcryDiff !== 0) {
        return warcryDiff;
      }

      if (normalizedMaxWarcry > 0) {
        const aAtCap = hasReachedWarcryCap(a);
        const bAtCap = hasReachedWarcryCap(b);
        if (aAtCap !== bAtCap) {
          return bAtCap ? 1 : -1;
        }
      }

      return a.totalExp - b.totalExp;
    };

    const queue: WarcryState[] = [initialState];
    let queueDirty = false;
    let processedStates = 0;
    // The beam plateaus long before the hard explore cap; without this the button
    // ran for the better part of an hour and looked hung.
    let lastImprovement = 0;
    const stagnationLimit = Math.max(4000, (batchSize > 0 ? batchSize : 250) * 40);

    const ensureQueueSorted = () => {
      if (queueDirty) {
        queue.sort(compareStates);
        queueDirty = false;
      }
    };

    const enqueueState = (state: WarcryState) => {
      queue.push(state);
      queueDirty = true;
      // Prune with slack. Sorting on every push made each expanded candidate cost
      // a full beam-width sort per child, which is what made the optimizers look
      // hung; the loop below re-sorts and trims to the beam width anyway.
      if (queue.length > maxQueueSize * 2) {
        ensureQueueSorted();
        queue.length = maxQueueSize;
      }
    };

    while (queue.length > 0) {
      ensureQueueSorted();
      if (queue.length > maxQueueSize) {
        queue.length = maxQueueSize;
      }
      const state = queue.shift();
      if (!state) {
        break;
      }

      const key = serializeState(state);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      const build = evaluateState(state, workingBuild);

      const statSnapshots = statIndices.map(index => {
        const statRow = build.statRows[index];
        return { base: statRow.base, maxBase: statRow.maxBase };
      });
      const cwSnapshot = build.profRows[cwIndex];
      const professionSnapshot = build.statRows[professionIndex];

      if (progress) {
        progress.exploredCount += 1;
        progress.highestLevelSeen = Math.max(progress.highestLevelSeen, build.totalLevel);
      }

      if (state.totalExp < targetExp) {
        trackBest(state);

        const warcryMod = state.warcry;
        const enduranceMod = state.enduranceMod;

        if (enduranceIndex !== -1 && enduranceMod < warcryMod / 3) {
          const enduranceRow = statSnapshots[enduranceIndex];
          if (enduranceRow && enduranceRow.base < enduranceRow.maxBase) {
            const statBases = [...state.statBases];
            statBases[enduranceIndex] = enduranceRow.base + 1;
            const candidate: WarcryState = {
              statBases,
              cwPoints: state.cwPoints,
              professionBase: state.professionBase,
              totalExp: state.totalExp,
              warcry: state.warcry,
              warcryBase: state.warcryBase,
              enduranceMod: state.enduranceMod
            };
            const candidateBuild = evaluateState(candidate, candidateWorkingBuild);
            if (candidateBuild.totalExp < targetExp && !visited.has(serializeState(candidate))) {
              enqueueState({ ...candidate, statBases: [...candidate.statBases] });
            }
          }
        } else {
          const candidates: WarcryState[] = [];

          statsToAdjust.forEach((statName, index) => {
            const statRow = statSnapshots[index];
            if (statRow && statRow.base < statRow.maxBase) {
              if (shouldSkipEquivalentStatIncrease(build, statName)) {
                return;
              }

              const statBases = [...state.statBases];
              statBases[index] = statRow.base + 1;
              const candidate: WarcryState = {
                statBases,
                cwPoints: state.cwPoints,
                professionBase: state.professionBase,
                totalExp: state.totalExp,
                warcry: state.warcry,
                warcryBase: state.warcryBase,
                enduranceMod: state.enduranceMod
              };
              const candidateBuild = evaluateState(candidate, candidateWorkingBuild);
              if (candidateBuild.totalExp < targetExp && !visited.has(serializeState(candidate))) {
                candidates.push({ ...candidate, statBases: [...candidate.statBases] });
              }
            }
          });

          const cwRow = cwSnapshot;
          const professionRow = professionSnapshot;
          if (canRaiseProfession && cwRow && professionRow && cwRow.points < cwRow.max) {
            const newCWPoints = Math.min(cwRow.max, cwRow.points < cwRow.basePoints ? cwRow.basePoints : cwRow.points + cwRow.improvePoints);
            const professionBase = Math.max(professionRow.base, newCWPoints);
            const candidate: WarcryState = {
              statBases: [...state.statBases],
              cwPoints: newCWPoints,
              professionBase,
              totalExp: state.totalExp,
              warcry: state.warcry,
              warcryBase: state.warcryBase,
              enduranceMod: state.enduranceMod
            };
            const candidateBuild = evaluateState(candidate, candidateWorkingBuild);
            if (candidateBuild.totalExp < targetExp && !visited.has(serializeState(candidate))) {
              candidates.push({ ...candidate, statBases: [...candidate.statBases] });
            }
          }

          if (candidates.length > 0) {
            const currentScore = warcryScore(state);
            const prioritizedCandidates = candidates.some(c => warcryScore(c) > currentScore)
              ? candidates.filter(c => warcryScore(c) >= currentScore)
              : candidates;

            prioritizedCandidates
              .sort(compareStates)
              .forEach(candidate => enqueueState(candidate));
          }
        }
      }

      processedStates += 1;
      if (maxExplored > 0 && processedStates >= maxExplored) {
        if (progress) {
          progress.limitReached = true;
        }
        break;
      }
      if (hasValidSnapshot && processedStates - lastImprovement >= stagnationLimit) {
        break;
      }
      if (batchSize > 0 && processedStates % batchSize === 0) {
        if (progress) {
          progress.bestWarcry = hasValidSnapshot ? warcryScore(bestSnapshot) : 0;
          progress.bestBuildLevel = expToLevel(bestSnapshot.totalExp);
        }
        onProgress?.(progress ?? {
          exploredCount: 0,
          highestLevelSeen: 0,
          bestWarcry: 0,
          bestBuildLevel: 0
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (!hasValidSnapshot) {
      throw new Error('No valid warcry build found that satisfies the endurance requirement for warcry.');
    }

    const bestBuild = (() => {
      const build = seed.clone();
      statsToAdjust.forEach((_, index) => {
        const statRowIndex = statIndices[index];
        build.statRows[statRowIndex].base = bestSnapshot.statBases[index];
      });
      build.profRows[cwIndex].points = bestSnapshot.cwPoints;
      build.statRows[professionIndex].base = bestSnapshot.professionBase;
      build.calculateAllXp();
      return build;
    })();

    if (progress) {
      progress.bestWarcry = hasValidSnapshot ? warcryScore(bestSnapshot) : 0;
      progress.bestBuildLevel = bestBuild.totalLevel;
    }
    onProgress?.(progress ?? {
      exploredCount: 0,
      highestLevelSeen: 0,
      bestWarcry: 0,
      bestBuildLevel: 0
    });

    return bestBuild;
  }

  getOptimizationMetrics(maxWarcryCap = 0): Record<OptimizationMetric, number> {
    const cappedWarcry = maxWarcryCap > 0 ? Math.min(this.warcry, maxWarcryCap) : this.warcry;
    return {
      offense: this.offense,
      defense: this.defense,
      immunity: this.immunity,
      freeze: this.freeze,
      lightning: this.lightning,
      fire: this.fire,
      warcry: cappedWarcry
    };
  }

  async createWeightedOptimizedBuild(
    request: OptimizationRequest,
    progress?: OptimizationProgress,
    onProgress?: (progress: OptimizationProgress) => void,
    batchSize = 250,
    beamWidth = 800,
    allowProfessionUpgrades = true
  ): Promise<Build> {
    const normalizedTargetLevel = (() => {
      const safeLevel = Math.max(1, request.targetLevel);
      if (Number.isInteger(safeLevel)) {
        return safeLevel + Number.EPSILON;
      }
      return safeLevel;
    })();

    const targetExp = levelToExp(normalizedTargetLevel);
    const expBudget = targetExp * (1 - Math.min(99, Math.max(0, request.reservePercent)) / 100);
    const normalizedMaxWarcry = Math.max(0, Math.floor(request.maxWarcry ?? 0));
    const weightIsActive = (metric: OptimizationMetric) =>
      (request.weights?.[metric] ?? 0) > 0 || request.minRequirement?.metric === metric;
    const activeMetrics = new Set<OptimizationMetric>(
      (Object.keys(request.weights) as OptimizationMetric[]).filter(weightIsActive)
    );
    if (request.minRequirement) {
      activeMetrics.add(request.minRequirement.metric);
    }

    const activeStats = new Set<string>();
    const addActiveStat = (...stats: string[]) => stats.forEach(stat => activeStats.add(stat));

    if (activeMetrics.has('offense')) {
      addActiveStat(
        Stats.INT,
        Stats.AGI,
        Stats.STR,
        Stats.WIS,
        Stats.TACTICS,
        Stats.ATTACK,
        Stats.DAGGER,
        Stats.H2H,
        Stats.STAFF,
        Stats.SWORD,
        Stats.TWOHAND,
        Stats.FREEZE,
        Stats.LIGHTNING,
        Stats.FIRE
      );
    }

    if (activeMetrics.has('defense')) {
      addActiveStat(
        Stats.INT,
        Stats.AGI,
        Stats.STR,
        Stats.WIS,
        Stats.TACTICS,
        Stats.PARRY,
        Stats.MAGIC_SHIELD,
        Stats.DAGGER,
        Stats.H2H,
        Stats.STAFF,
        Stats.SWORD,
        Stats.TWOHAND
      );
    }

    if (activeMetrics.has('immunity')) {
      addActiveStat(Stats.INT, Stats.STR, Stats.WIS, Stats.TACTICS);
    }

    if (activeMetrics.has('freeze')) {
      addActiveStat(Stats.FREEZE, Stats.INT, Stats.WIS, Stats.TACTICS);
    }

    if (activeMetrics.has('lightning')) {
      addActiveStat(Stats.LIGHTNING, Stats.INT, Stats.WIS, Stats.TACTICS);
    }

    if (activeMetrics.has('fire')) {
      addActiveStat(Stats.FIRE, Stats.INT, Stats.WIS, Stats.TACTICS);
    }

    if (activeMetrics.has('warcry')) {
      addActiveStat(Stats.WARCRY, Stats.TACTICS, Stats.INT, Stats.AGI, Stats.STR);
    }

    const canRaiseProfession = allowProfessionUpgrades && normalizedTargetLevel >= 20 && activeStats.size > 0;

    const adjustableStats = [
      Stats.INT,
      Stats.AGI,
      Stats.STR,
      Stats.WIS,
      Stats.TACTICS,
      Stats.WARCRY,
      Stats.FREEZE,
      Stats.LIGHTNING,
      Stats.FIRE,
      Stats.ATTACK,
      Stats.PARRY,
      Stats.MAGIC_SHIELD,
      Stats.SWORD,
      Stats.TWOHAND,
      Stats.DAGGER,
      Stats.STAFF,
      Stats.H2H
    ];

    const seed = new Build();
    seed.selectedClass = this.selectedClass;
    seed.blessed = this.blessed;
    seed.maxingBless = this.maxingBless;
    seed.hardcore = this.hardcore;
    seed.maxingEquipment = true;
    seed.unarched = this.unarched;
    seed.thiefMode = this.thiefMode;

    seed.statRows = seed.statRows.map(row => ({
      ...row,
      base: row.minBase,
      equipmentBonus: 0
    }));
    seed.profRows = seed.profRows.map(row => ({ ...row, points: 0 }));
    seed.calculateAllXp();

    const statsToAdjust = adjustableStats.filter(name => {
      const row = seed.statRows.find(r => r.name === name);
      return activeStats.has(name) && row && seed.isVisible(row);
    });

    const statIndices = statsToAdjust.map(name => seed.statRows.findIndex(r => r.name === name));
    const statIndexLookup = new Map<string, number>();
    statsToAdjust.forEach((name, index) => statIndexLookup.set(name, index));

    const cwIndex = seed.profRows.findIndex(r => r.name === Professions.CW);
    const professionIndex = seed.statRows.findIndex(r => r.name === Stats.PROFESSION);

    if (statIndices.some(index => index === -1) || cwIndex === -1 || professionIndex === -1) {
      throw new Error('Unable to locate required stat or profession rows for stat optimization.');
    }

    type OptimizationState = {
      statBases: number[];
      cwPoints: number;
      professionBase: number;
      totalExp: number;
      score: number;
      metrics: Record<OptimizationMetric, number>;
    };

    const serializeState = (state: OptimizationState) => [...state.statBases, state.cwPoints, state.professionBase].join(',');

    const workingBuild = seed.clone();
    const candidateWorkingBuild = seed.clone();

    const applyStateToBuild = (state: OptimizationState, build: Build) => {
      statsToAdjust.forEach((_, index) => {
        const statRowIndex = statIndices[index];
        build.statRows[statRowIndex].base = state.statBases[index];
      });

      build.profRows[cwIndex].points = state.cwPoints;
      build.statRows[professionIndex].base = state.professionBase;
      build.calculateAllXp();
      return build;
    };

    const evaluateState = (state: OptimizationState, build: Build) => {
      applyStateToBuild(state, build);
      state.totalExp = build.totalExp;
      state.metrics = build.getOptimizationMetrics(normalizedMaxWarcry);
      state.score = Object.entries(request.weights).reduce((sum, [key, weight]) => {
        const metricKey = key as OptimizationMetric;
        return sum + (weight || 0) * (state.metrics[metricKey] ?? 0);
      }, 0);
      return build;
    };

    const initialMetrics = seed.getOptimizationMetrics(normalizedMaxWarcry);
    const initialState: OptimizationState = {
      statBases: statsToAdjust.map((_, index) => seed.statRows[statIndices[index]].base),
      cwPoints: seed.profRows[cwIndex].points,
      professionBase: seed.statRows[professionIndex].base,
      totalExp: seed.totalExp,
      score: Object.entries(request.weights).reduce((sum, [key, weight]) => {
        const metricKey = key as OptimizationMetric;
        return sum + (weight || 0) * (initialMetrics[metricKey] ?? 0);
      }, 0),
      metrics: initialMetrics
    };

    const visited = new Set<string>();
    let bestSnapshot: OptimizationState = { ...initialState, statBases: [...initialState.statBases], metrics: { ...initialState.metrics } };
    let hasValidSnapshot = !request.minRequirement || initialMetrics[request.minRequirement.metric] >= request.minRequirement.value;
    const maxQueueSize = Math.max(1, beamWidth);

    const isStateValid = (state: OptimizationState) => {
      if (!request.minRequirement) return true;
      return (state.metrics[request.minRequirement.metric] ?? 0) >= request.minRequirement.value;
    };

    const trackBest = (state: OptimizationState) => {
      if (!isStateValid(state)) {
        return;
      }

      const bestScore = hasValidSnapshot ? bestSnapshot.score : -Infinity;
      const shouldReplaceBest = (!hasValidSnapshot) || state.score > bestScore || (state.score === bestScore && state.totalExp < bestSnapshot.totalExp);

      if (shouldReplaceBest) {
        bestSnapshot = { ...state, statBases: [...state.statBases], metrics: { ...state.metrics } };
        hasValidSnapshot = true;
        lastImprovement = processedStates;
      }

      if (progress) {
        progress.bestScore = bestSnapshot.score;
        progress.bestBuildLevel = expToLevel(bestSnapshot.totalExp);
      }
    };

    const compareStates = (a: OptimizationState, b: OptimizationState) => {
      const aValid = isStateValid(a);
      const bValid = isStateValid(b);
      if (aValid !== bValid) {
        return bValid ? 1 : -1;
      }

      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return a.totalExp - b.totalExp;
    };

    const equivalentStats = [Stats.INT, Stats.AGI, Stats.STR, Stats.WIS].filter(name =>
      statsToAdjust.includes(name)
    );
    const shouldSkipEquivalentStatIncrease = (build: Build, statName: string) => {
      if (!equivalentStats.includes(statName)) {
        return false;
      }

      const rows = equivalentStats
        .map(name => build.statRows.find(r => r.name === name))
        .filter((row): row is StatRow => !!row);

      if (rows.length !== equivalentStats.length) {
        return false;
      }

      const targetRow = rows.find(r => r.name === statName);
      if (!targetRow) {
        return false;
      }

      const targetBase = targetRow.base;
      const highestBase = Math.max(...rows.map(r => r.base));

      if (targetBase < highestBase) {
        return false;
      }

      return rows.some(r => r.name !== statName && r.base < targetBase && r.base < r.maxBase);
    };

    const queue: OptimizationState[] = [initialState];
    let queueDirty = false;
    let processedStates = 0;
    // The beam plateaus long before the hard explore cap; without this the button
    // ran for the better part of an hour and looked hung.
    let lastImprovement = 0;
    const stagnationLimit = Math.max(4000, (batchSize > 0 ? batchSize : 250) * 40);

    const ensureQueueSorted = () => {
      if (queueDirty) {
        queue.sort(compareStates);
        queueDirty = false;
      }
    };

    const enqueueState = (state: OptimizationState) => {
      queue.push(state);
      queueDirty = true;
      // Prune with slack. Sorting on every push made each expanded candidate cost
      // a full beam-width sort per child, which is what made the optimizers look
      // hung; the loop below re-sorts and trims to the beam width anyway.
      if (queue.length > maxQueueSize * 2) {
        ensureQueueSorted();
        queue.length = maxQueueSize;
      }
    };

    while (queue.length > 0) {
      ensureQueueSorted();
      if (queue.length > maxQueueSize) {
        queue.length = maxQueueSize;
      }
      const state = queue.shift();
      if (!state) {
        break;
      }

      const key = serializeState(state);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      const build = evaluateState(state, workingBuild);

      const statSnapshots = statIndices.map(index => {
        const statRow = build.statRows[index];
        return { base: statRow.base, maxBase: statRow.maxBase, name: statRow.name };
      });
      const cwSnapshot = build.profRows[cwIndex];
      const professionSnapshot = build.statRows[professionIndex];

      if (progress) {
        progress.exploredCount += 1;
        progress.highestLevelSeen = Math.max(progress.highestLevelSeen, build.totalLevel);
      }

      if (state.totalExp <= expBudget) {
        trackBest(state);

        const candidates: OptimizationState[] = [];

        statsToAdjust.forEach((statName, index) => {
          const statRow = statSnapshots[index];
          if (statRow && statRow.base < statRow.maxBase) {
            if (shouldSkipEquivalentStatIncrease(build, statName)) {
              return;
            }

            const statBases = [...state.statBases];
            statBases[index] = statRow.base + 1;
            const candidate: OptimizationState = {
              statBases,
              cwPoints: state.cwPoints,
              professionBase: state.professionBase,
              totalExp: state.totalExp,
              score: state.score,
              metrics: state.metrics
            };
            const candidateBuild = evaluateState(candidate, candidateWorkingBuild);
            if (candidateBuild.totalExp <= expBudget && !visited.has(serializeState(candidate))) {
              candidates.push({ ...candidate, statBases: [...candidate.statBases], metrics: { ...candidate.metrics } });
            }
          }
        });

        const cwRow = cwSnapshot;
        const professionRow = professionSnapshot;
        if (canRaiseProfession && cwRow && professionRow && cwRow.points < cwRow.max) {
          const newCWPoints = Math.min(cwRow.max, cwRow.points < cwRow.basePoints ? cwRow.basePoints : cwRow.points + cwRow.improvePoints);
          const professionBase = Math.max(professionRow.base, newCWPoints);
          const candidate: OptimizationState = {
            statBases: [...state.statBases],
            cwPoints: newCWPoints,
            professionBase,
            totalExp: state.totalExp,
            score: state.score,
            metrics: state.metrics
          };
          const candidateBuild = evaluateState(candidate, candidateWorkingBuild);
          if (candidateBuild.totalExp <= expBudget && !visited.has(serializeState(candidate))) {
            candidates.push({ ...candidate, statBases: [...candidate.statBases], metrics: { ...candidate.metrics } });
          }
        }

        if (candidates.length > 0) {
          candidates
            .sort(compareStates)
            .forEach(candidate => enqueueState(candidate));
        }
      }

      processedStates += 1;
      if (hasValidSnapshot && processedStates - lastImprovement >= stagnationLimit) {
        break;
      }
      if (batchSize > 0 && processedStates % batchSize === 0) {
        if (progress) {
          progress.bestScore = hasValidSnapshot ? bestSnapshot.score : 0;
          progress.bestBuildLevel = expToLevel(bestSnapshot.totalExp);
        }
        onProgress?.(progress ?? {
          exploredCount: 0,
          highestLevelSeen: 0,
          bestScore: 0,
          bestBuildLevel: 0
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    if (!hasValidSnapshot) {
      throw new Error('No valid optimized build found that satisfies the requested minimum requirement.');
    }

    const bestBuild = (() => {
      const build = seed.clone();
      statsToAdjust.forEach((_, index) => {
        const statRowIndex = statIndices[index];
        build.statRows[statRowIndex].base = bestSnapshot.statBases[index];
      });
      build.profRows[cwIndex].points = bestSnapshot.cwPoints;
      build.statRows[professionIndex].base = bestSnapshot.professionBase;
      build.calculateAllXp();
      return build;
    })();

    if (progress) {
      progress.bestScore = hasValidSnapshot ? bestSnapshot.score : 0;
      progress.bestBuildLevel = bestBuild.totalLevel;
    }
    onProgress?.(progress ?? {
      exploredCount: 0,
      highestLevelSeen: 0,
      bestScore: 0,
      bestBuildLevel: 0
    });

    return bestBuild;
  }

  /*
  ngOnInit() {
    this.calculateAllXp();
  }*/

  calculateAllXp() {
    this.totalExp = 0;
    this.statRows.forEach(row => {

      this.sanitizeRowInput(row);
      row.expCost = this.calculateExp(row);
      this.totalExp += row.expCost || 0;
      row.maxingEquipmentBonus = maxingGear(this.selectedClass, row.base);
      this.stats[row.name] = row;
    });
    this.totalLevel = expToLevel(this.totalExp);

    
    this.calculateProfs();

    this.calculateMods();

    let highestBaseWeapon: StatRow | null = null;

    this.weapons.forEach(weaponName => {

      const weaponStat = this.stats[weaponName];

      if (weaponStat && this.isVisible(weaponStat)) {
        if (!highestBaseWeapon || weaponStat.base > highestBaseWeapon.base) {
          highestBaseWeapon = weaponStat;
        }
      }
    });

    this.currentWeapon = highestBaseWeapon;

    this.weaponSkillMod = this.weapons.reduce((best, weaponName) => {
      const weaponStat = this.stats[weaponName];
      if (!weaponStat || !this.isVisible(weaponStat)) return best;
      return Math.max(best, weaponStat.mod ?? 0);
    }, 0);


    this.calculateWV();
    this.calculateAV();
    this.calculateSpeed();
    this.calculateOffense();
    this.calculateDefense();
    this.surroundOffense = this.calculateSurroundOffense();
    this.calculateModsWithTactics();
    this.calculateThief();
    this.calculatePerceptionSquares();
    this.calculateStealthSquares();
  }

  sanitizeRowInput(row: StatRow) {
    row.maxBase = this.maxBase(row);

    row.base = Math.max(row.minBase, Math.min(row.maxBase, row.base));
    row.equipmentBonus = Math.max(0, row.equipmentBonus ?? 0);
  }

  calculateExp(row: StatRow) {
    return totalExp(row, this.selectedClass, this.hardcore);
  }

  calculateBaseAttributeMods() {
    const baseAttributes = [Stats.WIS, Stats.INT, Stats.AGI, Stats.STR];

    // get unblessed bless mod
    let bless = this.getBlessBonus();

    let cw = this.profs[Professions.CW].points;

    this.statRows.forEach(stat => {

      if (!baseAttributes.includes(stat.name)) return;
      
      this.sanitizeRowInput(stat);
      var mod = stat.base;

      let maxingBlessMod = maxingBless(this.selectedClass, stat.base);
      let blessAdd = Math.floor(Math.min(bless, maxingBlessMod)/4);

      if (this.blessed == false) {
        blessAdd = 0;
      }

      if (stat.equipmentDisabled !== true) {
        if (this.maxingEquipment) {

          stat.modFromEquipment = stat.maxingEquipmentBonus || 0;

        } else {

          stat.modFromEquipment = Math.min(stat.equipmentBonus || 0, stat.maxingEquipmentBonus || 9999);
        }
      } else {
        stat.modFromEquipment = 0;
      }
      
      // mages: add bless
      if (this.selectedClass == Classes.Mage)
        {
            //Bless = Math.Min(Bless, MaxingBless);
            mod += blessAdd + stat.modFromEquipment;
        }
        else
        {
            // seyan/warrior: bless only fills what gear left unfilled, and the pair
            // is capped at the same ceiling gear alone would hit.
            mod += Math.min(blessAdd + stat.modFromEquipment, maxingGear(this.selectedClass, stat.base));

        }

        
        // Clan Warrior points go straight onto the attribute.
        mod += cw;

        stat.mod = mod;

        this.stats[stat.name] = stat;
    });

    
  }

  calculateMod(stat : StatRow) {
    
  }

  calculateMods() {

    // Step 1: Calculate mods for base attributes first
    this.calculateBaseAttributeMods();

    this.statRows.forEach(stat => {

      this.sanitizeRowInput(stat);
      var mod = stat.base;
      var nextBaseIncreaseMod = stat.base + 1;
      var lastBaseIncreaseMod = stat.base - 1;

      if (this.isVisible(stat)) {
        if (stat.attributes) {

          stat.modFromAttributes = this.calculateAttributeMod(attributesFor(this.selectedClass, stat) ?? stat.attributes);
          mod += stat.modFromAttributes;
          nextBaseIncreaseMod += stat.modFromAttributes;
          lastBaseIncreaseMod += stat.modFromAttributes;

          let maxMod = Math.max(15 + stat.base, stat.base * 3);
          mod = Math.floor(Math.min(maxMod, mod));

          let maxNextBaseIncreaseMod = Math.max(15 + stat.base + 1, (stat.base+1) * 3);
          nextBaseIncreaseMod = Math.floor(Math.min(maxNextBaseIncreaseMod, nextBaseIncreaseMod));

          let maxLastBaseIncreaseMod = Math.max(15 + stat.base - 1, (stat.base-1) * 3);
          lastBaseIncreaseMod = Math.floor(Math.min(maxLastBaseIncreaseMod, lastBaseIncreaseMod));

        } else {

          if (stat.ptmDisabled == true) {
            // vitals: HP Mana End

          } else {
            return;
          }
        }

        stat.equipmentBonus = stat.equipmentBonus || 0;

        if (stat.equipmentDisabled !== true) {

          if (this.maxingEquipment) {
            stat.modFromEquipment = stat.maxingEquipmentBonus || 0;
          } else {
            stat.modFromEquipment = Math.min(stat.equipmentBonus || 0, stat.maxingEquipmentBonus || 9999);
          }

          let maxingEquipmentBonusNextBase = maxingGear(this.selectedClass, stat.base + 1);

          if (this.maxingEquipment) {
            nextBaseIncreaseMod += maxingEquipmentBonusNextBase || 0;
          } else {
            nextBaseIncreaseMod += Math.min(stat.equipmentBonus || 0, maxingEquipmentBonusNextBase || 9999);
          }

          let maxingEquipmentBonusLastBase = maxingGear(this.selectedClass, stat.base - 1);

          if (this.maxingEquipment) {
            lastBaseIncreaseMod += maxingEquipmentBonusLastBase || 0;
          } else {
            lastBaseIncreaseMod += Math.min(stat.equipmentBonus || 0, maxingEquipmentBonusLastBase || 9999);
          }

        } else {
          stat.modFromEquipment = 0;
        }

        mod += stat.modFromEquipment;
        mod += this.professionSkillBonus(stat);

        stat.mod = mod;

        stat.nextBaseIncreaseModIncrease = nextBaseIncreaseMod - mod;
        stat.nextBaseIncreaseMod = nextBaseIncreaseMod;

        stat.lastBaseIncreaseModIncrease = mod - lastBaseIncreaseMod;
        stat.lastBaseIncreaseMod = lastBaseIncreaseMod;

      } else {

        stat.mod = 0;
      }

      this.stats[stat.name] = stat;
    });

  }

  calculateProfs() {

    var profession = this.stats[Stats.PROFESSION];

    let professionPoints = profession.base;
    this.usedProfessionPoints = 0;

    this.profRows.forEach(row => {
      
      if (row.points < row.basePoints) row.points = 0;
      else if (row.points > row.max) row.points = row.max;
      else {

        var timesImproved = Math.floor((row.points - row.basePoints)/row.improvePoints);


        row.points = row.basePoints + timesImproved * row.improvePoints;
      }

      this.usedProfessionPoints += row.points;

      this.profs[row.name] = row;
    });

    this.remainingProfessionPoints = professionPoints - this.usedProfessionPoints;
  }

  calculateModsWithTactics() {

    const tacticsMod = this.stats[Stats.TACTICS]?.mod ?? 0;
    const active = this.tacticsActive && this.selectedClass != Classes.Mage;

    // Warrior and seyan price the immunity bonus differently: the warrior form
    // uses (tactics + 14) * 11/80, the seyan form (tactics + 14) / 8.
    const spellAdd = active ? Math.floor(tacticsMod * 0.125) : 0;
    const immunityAdd = !active
      ? 0
      : this.selectedClass == Classes.Warrior
        ? Math.floor(((tacticsMod + 14) * 11) / 80)
        : Math.floor((tacticsMod + 14) * 0.125);

    // The warrior form only pushes tactics into warcry and immunity; the seyan
    // form spreads it across the attack spells as well.
    const boosted = this.selectedClass == Classes.Seyan
      ? [Stats.LIGHTNING, Stats.FIRE, Stats.PULSE, Stats.FREEZE, Stats.WARCRY]
      : [Stats.WARCRY];

    [Stats.WARCRY, Stats.FREEZE, Stats.LIGHTNING, Stats.FIRE, Stats.PULSE].forEach(name => {
      const stat = this.stats[name];
      if (!stat) return;
      stat.modFromTactics = boosted.includes(name) ? spellAdd : 0;
      stat.modWithTactics = (stat.mod ?? 0) + stat.modFromTactics;
      this.stats[name] = stat;
    });

    const immunityStat = this.stats[Stats.IMMUNITY];
    immunityStat.modFromTactics = immunityAdd;
    immunityStat.modWithTactics = (immunityStat.mod ?? 0) + immunityAdd;
    this.stats[Stats.IMMUNITY] = immunityStat;

    this.warcry = this.stats[Stats.WARCRY].modWithTactics ?? 0;
    this.freeze = this.stats[Stats.FREEZE].modWithTactics ?? 0;
    this.lightning = this.stats[Stats.LIGHTNING].modWithTactics ?? 0;
    this.fire = this.stats[Stats.FIRE].modWithTactics ?? 0;
    this.immunity = immunityStat.modWithTactics ?? 0;
  }

  // Clan Wars only folds tactics into offense/defense while the tactics toggle is
  // on, and prices it differently per class.
  tacticsOffenseBonus() {
    if (!this.tacticsActive) return 0;

    const tacticsMod = this.stats[Stats.TACTICS]?.mod ?? 0;

    if (this.selectedClass == Classes.Warrior) return Math.trunc((tacticsMod - 20) / 3) + 20;
    if (this.selectedClass == Classes.Seyan) return Math.trunc(tacticsMod * 0.375);

    return 0;
  }

  rageBonus() {
    if (!this.rageActive || this.selectedClass != Classes.Warrior) return 0;

    return Math.floor((this.stats[Stats.RAGE]?.mod ?? 0) / 7);
  }

  // Mages get a slice of their Clan Warrior points on spells and light weapons.
  professionSkillBonus(stat: StatRow) {
    if (this.selectedClass != Classes.Mage) return 0;

    const boosted = [
      Stats.IMMUNITY, Stats.FIRE, Stats.LIGHTNING, Stats.FREEZE, Stats.PULSE,
      Stats.MAGIC_SHIELD, Stats.DAGGER, Stats.STAFF, Stats.H2H
    ];

    if (!boosted.includes(stat.name)) return 0;

    return Math.floor(this.profs[Professions.CW].points / 15);
  }
  
  calculateDefense() {

    if (this.selectedClass == Classes.Mage) {
      this.defense = this.weaponSkillMod + 2 * (this.stats[Stats.MAGIC_SHIELD]?.mod ?? 0);
      return;
    }

    this.defense = this.weaponSkillMod
      + 2 * (this.stats[Stats.PARRY]?.mod ?? 0)
      + this.tacticsOffenseBonus()
      + this.rageBonus();
  }

  calculateOffense() {

    if (this.selectedClass == Classes.Mage) {
      // Mage offense is spell-driven and pays a penalty for its own level.
      this.offense = Math.trunc(
        this.weaponSkillMod + this.getSpellAverage() * 2 - Math.trunc(this.totalLevel)
      );
      return;
    }

    this.offense = this.weaponSkillMod
      + 2 * (this.stats[Stats.ATTACK]?.mod ?? 0)
      + this.tacticsOffenseBonus()
      + this.rageBonus();
  }

  // Clan Wars also shows the offense you swing at with surround hit up.
  calculateSurroundOffense() {
    if (this.selectedClass == Classes.Mage) return 0;

    return this.weaponSkillMod
      + (2 * (this.stats[Stats.SURROUND_HIT]?.mod ?? 0) - 12)
      + this.tacticsOffenseBonus()
      + this.rageBonus();
  }

  calculateSpeed() {

    // (agi + agi + str) / 5 + speedskill / 2 + athlete * 3 + 40.
    // The mage form has no speed skill, so it contributes nothing there.
    let speed = this.calculateAttributeMod([Stats.AGI, Stats.AGI, Stats.STR]);

    if (this.selectedClass != Classes.Mage) {
      speed += Math.floor((this.stats[Stats.SPEED_SKILL]?.mod ?? 0) / 2);
    }

    speed += 3 * this.profs[Professions.ATHLETE].points;

    this.speed = speed + 40;
  }

  getSpellAverage() {
    let spells = [Stats.BLESS, Stats.HEAL, Stats.FREEZE, Stats.MAGIC_SHIELD, Stats.LIGHTNING, Stats.FIRE, Stats.PULSE];

    let spellTotal = 0;

    spells.forEach((spellName) => {

      spellTotal += this.stats[spellName].mod ?? 0;
    });

    // "average"... this is how it's coded in game
    return spellTotal/8.0;
  }

  calculateAV() {

    if (this.selectedClass == Classes.Mage) {
      // get_spell_average(cn) * 17.5 / 20
      this.armorValue = Math.trunc((this.getSpellAverage() * 17.5) / 20.0);
      return;
    }

    // bodycontrol/4 worth of armour, plus a flat 14 and a step every 10 points
    // of armour skill.
    const bodyControlMod = this.stats[Stats.BODY_CONTROL]?.mod ?? 0;
    const armorBase = this.stats[Stats.ARMOR_SKILL]?.base ?? 1;

    this.armorValue = bodyControlMod * 0.25
      + (armorBase - 1) * 0.25
      + Math.floor(armorBase / 10) * 5.5
      + 14.0;
  }

  calculateWV() {

    const dagger = this.stats[Stats.DAGGER]?.base ?? 0;
    const h2h = this.stats[Stats.H2H]?.base ?? 0;

    if (this.selectedClass == Classes.Mage) {
      // The mage form only prices dagger and staff; an unarmed mage reads 0.
      const staff = this.stats[Stats.STAFF]?.base ?? 0;

      this.weaponValue = (h2h < dagger || h2h < staff)
        ? (dagger >= staff
            ? getWeaponValue(this.stats[Stats.DAGGER])
            : getWeaponValue(this.stats[Stats.STAFF]))
        : 0;

      return;
    }

    const sword = this.stats[Stats.SWORD]?.base ?? 0;
    const twoHand = this.stats[Stats.TWOHAND]?.base ?? 0;
    const bodyControlMod = this.stats[Stats.BODY_CONTROL]?.mod ?? 0;
    const best = Math.max(sword, twoHand, dagger, h2h);

    let weaponValue = Math.floor(bodyControlMod / 4);

    if (h2h >= best) {
      // Unarmed: body control carries the whole weapon value, capped at 90.
      weaponValue += Math.min(90, Math.floor(bodyControlMod / 2));
    } else {
      const weaponStat = best == sword
        ? this.stats[Stats.SWORD]
        : best == twoHand
          ? this.stats[Stats.TWOHAND]
          : this.stats[Stats.DAGGER];

      weaponValue += getWeaponValue(weaponStat);
    }

    this.weaponValue = weaponValue;
  }

  calculateThief() {

    let thiefPoints = this.profs[Professions.THIEF].points;

    this.stats[Stats.PERCEPTION].mod = (this.stats[Stats.PERCEPTION].mod ?? 0) + Math.floor(thiefPoints/2);
    this.stats[Stats.STEALTH].mod = (this.stats[Stats.STEALTH].mod ?? 0) + thiefPoints;

    if (this.thiefMode) {
      this.stats[Stats.STEALTH].mod = (this.stats[Stats.STEALTH].mod ?? 0) + thiefPoints;
    }
  }

  calculateAttributeMod(attributes: string[]): number {
    return calculateAttributeMod(attributes, this.stats);
  }



  maxBase(stat : StatRow) {
    const baseLimit = this.unarched ? 50 : null;

    // Clan Wars caps every base at skillmax; nothing can be bought past it.
    const cap = stat.name == Stats.PROFESSION
      ? 100
      : ptmBase(this.selectedClass, stat, this.hardcore);

    return baseLimit !== null ? Math.min(baseLimit, cap) : cap;
  }

  getBlessBonus() {
    var blessMod = 0;

    if (this.blessed)
    {
        // maxed, use arbitrarily high bless value
        if (this.maxingBless)
        {
            blessMod = 9999;
        }
        else
        {
            // self blessed, get unblessed bless mod

            if (this.selectedClass == Classes.Warrior)
            {
                return 0;
            }

            var intStat = this.stats[Stats.INT];
            var wisStat = this.stats[Stats.WIS];
            var blessStat = this.stats[Stats.BLESS];

            var intEquipmentBonus = Math.min(intStat.equipmentBonus || 0, intStat.maxingEquipmentBonus || 9999);
            var wisEquipmentBonus = Math.min(wisStat.equipmentBonus || 0, wisStat.maxingEquipmentBonus || 9999);
            var blessEquipmentBonus = Math.min(blessStat.equipmentBonus || 0, blessStat.maxingEquipmentBonus || 9999);

            var IntMod = intStat.base + intEquipmentBonus;
            var WisMod = wisStat.base + wisEquipmentBonus;
            var blessMod = blessStat.base + blessEquipmentBonus;

            /*
            if (this.LWDWBonus)
            {
                var LWDWBonus = this.LWDWValue / 2;
                Int += LWDWBonus;
                Wis += LWDWBonus;
            }

            if (this.CWBonus)
            {
                var CWBonus = this.CWValue;
                Int += CWBonus;
                Wis += CWBonus;
            }*/


            var strStat = this.stats[Stats.STR];
            var strEquipmentBonus = Math.min(strStat.equipmentBonus || 0, strStat.maxingEquipmentBonus || 9999);
            var StrMod = strStat.base + strEquipmentBonus;

            // Seyan bless keys off Int/Str/Wis, mage bless off Int/Int/Wis.
            let blessSecond = this.selectedClass == Classes.Seyan ? StrMod : IntMod;

            let blessBonusFromAttributes = Math.floor((IntMod + blessSecond + WisMod) / 5);

            blessMod += blessBonusFromAttributes;

            var blessMax = Math.max(15 + blessStat.base, blessStat.base * 3);

            blessMod = Math.min(blessMod, blessMax);
        }
    }

    return Math.floor(blessMod);
  }

  
  calculateFrozenSpeed(caster : Build) {

    var freezePower = caster.freeze - this.immunity;

    var speedLoss = -(200 + freezePower * 11);

    speedLoss = Math.min(0, speedLoss);

    return this.speed + speedLoss;

  }

  calculateWarcriedSpeed(caster : Build) {

    var warcryPower = caster.warcry - this.immunity;

    var speedLoss = -(100 + warcryPower * 6);

    speedLoss = Math.min(0, speedLoss);

    return this.speed + speedLoss;

  }

  calculateEnemyWarcry(warcriedSpeed : number) {

    if (warcriedSpeed >= this.speed) return -1;

    let speedLoss = -(this.speed - warcriedSpeed);

    var speedBeforeWarcryMod = (speedLoss + 100);

    if (speedBeforeWarcryMod%6 !== 0) return -1;

    return this.immunity - speedBeforeWarcryMod/6;
  }

  calculateEnemyFreeze(frozenSpeed : number) {

    if (frozenSpeed >= this.speed) return -1;

    let speedLoss = -(this.speed - frozenSpeed);

    var speedBeforeFreezeMod = (speedLoss + 200);

    if (speedBeforeFreezeMod%11 !== 0) return -1;

    return this.immunity - speedBeforeFreezeMod/11;
  }

  minPercToSeeXSquaresDark : number[] = [];
  minPercToSeeXSquaresLight : number[] = [];

  maxStealthCanSeeXSquaresDark : number[] = [];
  maxStealthCanSeeXSquaresLight : number[] = [];
  getMinimumStealthToAvoidSelf(lightValue: number, distance = 1) {
    const perceptionMod = this.stats[Stats.PERCEPTION].mod ?? 0;
    return minimumStealthToAvoidDetection(perceptionMod, lightValue, distance);
  }

  calculatePerceptionSquares() {

    this.minPercToSeeXSquaresDark = [];
    this.minPercToSeeXSquaresLight = [];

    var stealth = this.stats[Stats.STEALTH].mod ?? 0;

    for (var dist = 1; dist <= 20; dist++) {

      if (dist == 1 && this.thiefMode == false) {
        this.minPercToSeeXSquaresDark.push(1);
        this.minPercToSeeXSquaresLight.push(1);
      } else {

        let minPercToSeeDistSquaresDark = Math.max(1, stealth + Math.pow(dist+1, 2) - 1);
        let minPercToSeeDistSquaresLight = Math.max(1, stealth + Math.pow(dist+1, 2) - 65);

        this.minPercToSeeXSquaresDark.push(minPercToSeeDistSquaresDark);
        this.minPercToSeeXSquaresLight.push(minPercToSeeDistSquaresLight);
      }
    }
  }

  calculateStealthSquares() {

    this.maxStealthCanSeeXSquaresDark = [];
    this.maxStealthCanSeeXSquaresLight = [];

    var perception = 0 + 65;

    var maxLight = 32;

    var perception = this.stats[Stats.PERCEPTION].mod ?? 0;

    for (var dist = 1; dist <= 20; dist++) {

      let maxStealthCanSeeDistSquaresDark = Math.max(1, perception - Math.pow(dist+1, 2) + 1);
      let maxStealthCanSeeDistSquaresLight = Math.max(1, perception - Math.pow(dist+1, 2) + 65);

      this.maxStealthCanSeeXSquaresDark.push(maxStealthCanSeeDistSquaresDark);
      this.maxStealthCanSeeXSquaresLight.push(maxStealthCanSeeDistSquaresLight);
      
    }
  }

}
