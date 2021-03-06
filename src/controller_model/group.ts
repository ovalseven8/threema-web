/**
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

import {WebClientService} from '../services/webclient';
import {ControllerModelMode} from '../types/enums';
import {AvatarControllerModel} from './avatar';

export class GroupControllerModel implements threema.ControllerModel {

    private $log: ng.ILogService;
    private $translate: ng.translate.ITranslateService;
    private $mdDialog: ng.material.IDialogService;
    public members: string[];
    public name: string;
    public subject: string;
    public isLoading = false;

    private addContactPlaceholder: string;
    private group: threema.GroupReceiver;
    private webClientService: WebClientService;
    private avatarController: AvatarControllerModel;
    private mode: ControllerModelMode;
    private onRemovedCallback: any;

    constructor($log: ng.ILogService, $translate: ng.translate.ITranslateService, $mdDialog: ng.material.IDialogService,
                webClientService: WebClientService,
                mode: ControllerModelMode,
                group: threema.GroupReceiver = undefined) {
        this.$log = $log;
        this.$translate = $translate;
        this.$mdDialog = $mdDialog;

        this.group = group;
        this.mode = mode;
        this.webClientService = webClientService;
        this.addContactPlaceholder = $translate.instant('messenger.GROUP_SELECT_CONTACTS');

        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                this.subject = $translate.instant('messenger.EDIT_RECEIVER', {
                    receiverName: '@NAME@',
                }).replace('@NAME@', this.group.displayName);
                this.name = this.group.displayName;
                this.members = this.group.members;
                this.avatarController = new AvatarControllerModel(
                    this.$log, this.webClientService, this.group,
                );
                break;

            case ControllerModelMode.VIEW:
            case ControllerModelMode.CHAT:
                this.subject = this.group.displayName;
                this.members = this.group.members;
                break;

            case ControllerModelMode.NEW:
                this.subject = $translate.instant('messenger.CREATE_GROUP');
                this.members = [];
                this.avatarController = new AvatarControllerModel(
                    this.$log, this.webClientService, null,
                );
                break;

            default:
                $log.error('Invalid controller model mode: ', this.getMode());
        }
    }

    public getMaxMemberSize(): number {
        return this.webClientService.getMaxGroupMemberSize();
    }

    public setOnRemoved(callback: any): void {
        this.onRemovedCallback = callback;
    }

    public getMode(): ControllerModelMode {
        return this.mode;
    }

    public isValid(): boolean {
        return this.members.filter((identity: string) => {
                return identity !== this.webClientService.getMyIdentity().identity;
            }).length > 0;
    }

    public canView(): boolean {
        return true;
    }

    public canEdit(): boolean {
        return this.group.access !== undefined && (
                this.group.access.canChangeAvatar === true
                || this.group.access.canChangeName === true
                || this.group.access.canChangeMembers === true
            );
    }

    public canClean(): boolean {
        return this.canView();
    }

    public clean(ev: any): any {
        let confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('messenger.DELETE_THREAD'))
            .textContent(this.$translate.instant('messenger.DELETE_THREAD_MESSAGE', {count: 1}))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.YES'))
            .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyClean();
        }, () => {
            this.$log.debug('clean canceled');
        });
    }

    private reallyClean(): any {
        if (!this.canClean()) {
            this.$log.error('not allowed to clean this contact');
            return;
        }

        this.isLoading = true;
        this.webClientService.cleanReceiverConversation(this.group)
            .then(() => {
                this.isLoading = false;
            })
            .catch(() => {
                this.isLoading = false;
            });
    }

    public leave(ev): void {
        let confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('messenger.GROUP_LEAVE'))
            .textContent(this.$translate.instant(
                this.group.administrator === this.webClientService.getMyIdentity().identity
                    ? 'messenger.GROUP_REALLY_LEAVE_ADMIN'
                    : 'messenger.GROUP_REALLY_LEAVE'))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.OK'))
            .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyLeave();
        }, () => {
            this.$log.debug('leave canceled');
        });
    }

    private reallyLeave(): void {
        if (!this.group.access.canLeave) {
            this.$log.error('cannot leave group');
            return;
        }

        this.isLoading = true;
        this.webClientService.leaveGroup(this.group)
            .then(() => {
                this.isLoading = false;
            })
            .catch(() => {
                this.isLoading = false;
            });
    }

    public delete(ev): void {

        let confirm = this.$mdDialog.confirm()
            .title(this.$translate.instant('messenger.GROUP_DELETE'))
            .textContent(this.$translate.instant('messenger.GROUP_DELETE_REALLY'))
            .targetEvent(ev)
            .ok(this.$translate.instant('common.OK'))
            .cancel(this.$translate.instant('common.CANCEL'));

        this.$mdDialog.show(confirm).then(() => {
            this.reallyDelete();
        }, () => {
            this.$log.debug('delete canceled');
        });
    }

    private reallyDelete(): void {
        if (!this.group.access.canDelete) {
            this.$log.error('can not delete group');
            return;
        }

        this.isLoading = true;
        this.webClientService.deleteGroup(this.group)
            .then(() => {
                this.isLoading = false;
                if (this.onRemovedCallback) {
                    this.onRemovedCallback(this.group.id);
                }
            })
            .catch(() => {
                this.isLoading = false;
            });
    }

    public sync(ev): void {
        if (!this.group.access.canSync) {
            this.$log.error('cannot sync group');
            return;
        }

        this.isLoading = true;
        this.webClientService.syncGroup(this.group)
            .then(() => {
                this.isLoading = false;
            })
            .catch(() => {
                this.isLoading = false;
            });
    }

    public save(): Promise<threema.GroupReceiver> {
        switch (this.getMode()) {
            case ControllerModelMode.EDIT:
                return this.webClientService.modifyGroup(
                    this.group.id,
                    this.members,
                    this.name,
                    this.avatarController.getAvatar(),
                );
            case ControllerModelMode.NEW:

                return this.webClientService.createGroup(
                    this.members,
                    this.name,
                    this.avatarController.getAvatar());
            default:
                this.$log.error('not allowed to save group');

        }
    }

    public onChangeMembers(identities: string[]): void {
        this.members = identities;
    }

    public getMembers(): string[] {
        return this.members;
    }
}
